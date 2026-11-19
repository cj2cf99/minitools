import { GROUPS, TOOLS } from './tools/index.js';

const svg = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const iconMask = (paths) => `url("data:image/svg+xml,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
)}")`;
const inGroup = (group) => TOOLS.filter((t) => t.group === group.id);
const groups = GROUPS.filter((g) => inGroup(g).length);
const tone = (g) => `style="--tone:var(--t-${g.tone})"`;
const currentId = () => location.hash.replace(/^#\/?/, '');
const view = document.getElementById('view');

// 主站涟漪只覆盖首页入口，这里补上本页的入口和刷新按钮
document.addEventListener('pointerdown', (e) => {
	const el = e.target.closest?.('.portal,.refresh');
	if (!el) return;
	const r = el.getBoundingClientRect();
	el.style.setProperty('--t-rx', `${e.clientX - r.left}px`);
	el.style.setProperty('--t-ry', `${e.clientY - r.top}px`);
	el.classList.remove('t-ripple');
	void el.offsetWidth; // 重启涟漪
	el.classList.add('t-ripple');
}, { passive: true });
document.addEventListener('animationend', (e) => { if (e.animationName === 't-ripple') e.target.classList.remove('t-ripple'); });

function renderHome() {
	view.innerHTML = `<div class="page-head"><h1>饰品铺子</h1><span class="count">${TOOLS.length}</span></div>` + groups.map((g) => `
		<section class="tool-section" ${tone(g)}>
			<h2>${g.label}</h2>
			<div class="portals">${inGroup(g).map((t) => `
				<a class="portal" href="${t.href ?? '#/' + t.id}" aria-label="${t.name}" title="${t.name}：${t.desc}">
					<span class="portal-surface" aria-hidden="true"></span>
					<b class="tool-icon">${svg(t.icon)}</b>
					<span class="portal-label">${t.name}</span>
				</a>`).join('')}
			</div>
		</section>`).join('');
}

const toolStyles = new Map();
function loadCss(id) {
	if (!toolStyles.has(id)) {
		toolStyles.set(id, new Promise((done) => {
			const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `tools/${id}.css`, onload: done, onerror: done });
			document.head.append(link);
		}));
	}
	return toolStyles.get(id);
}

let unmount = null;
async function route() {
	const id = currentId();
	const tool = TOOLS.find((t) => t.id === id);
	unmount?.();
	unmount = null;
	if (tool?.href) return location.replace(tool.href); // 兼容旧的游戏哈希书签
	document.title = tool ? `${tool.name} · 饰品铺子` : '饰品铺子';
	if (!tool) return renderHome();
	view.innerHTML = `<div class="page-head" data-tool="${id}"><h1>${tool.name}</h1><a class="back" href="#/" aria-label="饰品铺子" title="返回饰品铺子">${svg('<path d="M19 12H5M11 6l-6 6 6 6"/>')}<span>饰品铺子</span></a></div><div id="tool"></div>`;
	const heading = view.querySelector('.page-head');
	if (tool.useHeadingIcon) heading.querySelector('h1').style.setProperty('--page-ico', iconMask(tool.icon));
	const target = document.getElementById('tool');
	const [{ mount }] = await Promise.all([import(`./tools/${id}.js`), loadCss(id)]); // 进入时才加载
	if (target.isConnected && currentId() === id) unmount = mount(target, heading);
}

addEventListener('hashchange', () => {
	if (!document.startViewTransition || TOOLS.some(t => t.href && t.id === currentId())) return route();
	document.startViewTransition(route).ready.catch(() => {}); // 页面隐藏时过渡会被中止，内容照常更新
});
route();
