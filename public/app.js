import { GROUPS, TOOLS } from './tools/index.js';

const svg = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
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
				<a class="portal" href="#/${t.id}" aria-label="${t.name}" title="${t.name}：${t.desc}">
					<span class="portal-surface" aria-hidden="true"></span>
					<b class="tool-icon">${svg(t.icon)}</b>
					<span class="portal-label">${t.name}</span>
				</a>`).join('')}
			</div>
		</section>`).join('');
}

function loadCss(id) {
	if (document.getElementById(`css-${id}`)) return null;
	return new Promise((done) => {
		const link = Object.assign(document.createElement('link'), { id: `css-${id}`, rel: 'stylesheet', href: `tools/${id}.css`, onload: done, onerror: done });
		document.head.append(link);
	});
}

let unmount = null;
async function route() {
	const id = currentId();
	const tool = TOOLS.find((t) => t.id === id);
	unmount?.();
	unmount = null;
	document.title = tool ? `${tool.name} · 饰品铺子` : '饰品铺子';
	if (!tool) return renderHome();
	view.innerHTML = `<div class="page-head"><h1>${tool.name}</h1><a class="back" href="#/">${svg('<path d="M19 12H5M11 6l-6 6 6 6"/>')}饰品铺子</a></div><div id="tool"></div>`;
	const [{ mount }] = await Promise.all([import(`./tools/${id}.js`), loadCss(id)]); // 进入时才加载
	if (currentId() === id) unmount = mount(document.getElementById('tool'));
}

addEventListener('hashchange', () => {
	if (!document.startViewTransition) return route();
	document.startViewTransition(route).ready.catch(() => {}); // 页面隐藏时过渡会被中止，内容照常更新
});
route();
