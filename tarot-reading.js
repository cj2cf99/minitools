import major from "./public/tools/magiccard/deck.js";
import minor from "./public/tools/magiccard/minor.js";

const deck = [...major, ...minor];
const topics = { 姻缘: "怎样靠近合适的人？", 前路: "下一步该往哪里走？", 事业: "工作中该把力气放在哪？" };
const adviceFormat = {type:"json_schema",json_schema:{name:"reading",strict:true,schema:{
  type:"object",properties:{advice:{type:"string"},action:{type:"string"}},
  required:["advice","action"],additionalProperties:false
}}};
function json(status, body) {
  return Response.json(body, {status, headers: {"Cache-Control":"no-store"}});
}

export async function readTarot(request, env, fetchModel = fetch) {
  if (request.method !== "POST") return new Response(null, {status:405, headers:{Allow:"POST"}});
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, {error:"请从牌桌打开解读。"});
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") return json(415,{error:"需要 JSON 牌阵。"});
  const reader = request.body?.getReader();
  if (!reader) return json(400,{error:"缺少牌阵。"});
  let body;
  try {
    const bytes = new Uint8Array(2048);
    let length = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (length + value.length > bytes.length) {
        void reader.cancel();
        return json(413,{error:"牌阵过长。"});
      }
      bytes.set(value, length);
      length += value.length;
    }
    body = JSON.parse(new TextDecoder().decode(bytes.subarray(0, length)));
  } catch { return json(400,{error:"牌阵格式有误。"}); }
  const {topic,cards} = body || {};
  if (typeof topic !== "string" || !Object.hasOwn(topics,topic) || !Array.isArray(cards) || cards.length !== 3 ||
      cards.some(c => !c || !Number.isInteger(c.id) || !deck[c.id] || !["upright","reversed"].includes(c.orientation)) ||
      new Set(cards.map(c => c.id)).size !== 3) return json(400,{error:"需要一个问题与三张不同的牌。"});
  const rows = cards.map(({id,orientation}, i) => {
    const card = deck[id];
    return `${["来处","当下","下一步"][i]}：${card[orientation].meaning}`;
  });
  if (!env.AI_BASE_URL || !env.AI_MODEL) return json(503,{error:"解读模型尚未配置。"});
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(150000)]);
  try {
    const messages = [
      {role:"system",content:"你在和一位坐在对面的客人说话。用温柔、亲切的日常中文直接回答对方选的问题，像认真听完后的回应。综合三条线索。advice 用一两句回应对方在意的事，action 给一个今天可以尝试的小举动。把选择留给对方，不编造对方的经历、关系或感受。仅输出含 advice 和 action 的 JSON，总计约60至100字。正文直接从回答开始，省略署名、称谓、标题、场景描写和逐条复述。"},
      {role:"user",content:`问题：${topics[topic]}\n参考材料：\n${rows.join("\n")}\n请将三条线索融合成一个回答。`},
    ];
    const complete = format => fetchModel(env.AI_BASE_URL.replace(/\/$/,"")+"/chat/completions",{
      method:"POST",signal, redirect:"manual",
      headers:{"Content-Type":"application/json",...(env.AI_API_KEY ? {Authorization:"Bearer "+env.AI_API_KEY}:{})},
      body:JSON.stringify({model:env.AI_MODEL,temperature:.6,max_tokens:500,messages,...(format ? {response_format:format} : {})})
    });
    let answer = await complete(adviceFormat);
    if ([400,422].includes(answer.status)) answer = await complete(null);
    if (!answer.ok) throw new Error("model HTTP " + answer.status);
    const result = await answer.json();
    const content = result.choices?.[0]?.message?.content;
    const bodyText = typeof content === "string" ? content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim() : "";
    const reading = JSON.parse(bodyText.replace(/^```(?:json)?\s*|\s*```$/gi,""));
    const text = [reading.advice,reading.action].map(part => {
      if (typeof part !== "string" || !part.trim()) throw new Error("empty");
      return part.trim().replace(/^(?:(?:我是)?(?:薇拉|月下占卜(?:屋的)?女巫|女巫)(?:[，、\s]*(?:薇拉|月下占卜(?:屋的)?女巫|女巫))*(?:说|答道)?[：:。！]\s*|(?:建议|行动|结论|解读)[：:]\s*)+/u,"");
    }).join("\n\n");
    return json(200,{text});
  } catch {
    return json(503,{error:"AI 服务暂未返回解读。可稍后重试，本局牌阵仍保留。"});
  }
}
