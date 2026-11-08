// 汇率读个股监察写入主站 D1 的 current_market_indicators，本 Worker 只读。
const SQL = "SELECT metric, value, daily_change_pct, source_as_of FROM current_market_indicators WHERE metric IN ('fx_jpy', 'fx_cny')";

export default {
	async fetch(request, env) {
		if (new URL(request.url).pathname !== '/api/fx') return new Response('Not Found', { status: 404 });
		const headers = { 'Cache-Control': 'no-store' };
		try {
			const { results } = await env.DB.prepare(SQL).all();
			const pick = (metric) => {
				const row = results.find((r) => r.metric === metric);
				if (!row) throw Error(`缺少 ${metric}`);
				return { rate: row.value, changePct: row.daily_change_pct, time: Date.parse(row.source_as_of) };
			};
			return Response.json({ usdjpy: pick('fx_jpy'), usdcny: pick('fx_cny') }, { headers });
		} catch (e) {
			return Response.json({ error: e.message }, { status: 503, headers });
		}
	},
};
