import { GROUPS, TOOLS } from './tools/index.js';

const svg = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const inGroup = (group) => TOOLS.filter((t) => t.group === group.id);
const groups = GROUPS.filter((g) => inGroup(g).length);
const tone = (g) => `style="--tone:var(--t-${g.tone})"`;
const currentId = () => location.hash.replace(/^#\/?/, '');
const HOME_ICON = '<path d="M12.8 12.6 3 22M16.5 11.3v5.6M20.2 12.6v2.4"/><circle cx="16.5" cy="18.8" r=".9"/><circle cx="20.2" cy="16.9" r=".9"/><path d="M14.27 4.43A2.4 2.4 0 1 1 18.73 4.43 2.4 2.4 0 1 1 20.11 8.67 2.4 2.4 0 1 1 16.5 11.3 2.4 2.4 0 1 1 12.89 8.67 2.4 2.4 0 1 1 14.27 4.43z"/><circle cx="16.5" cy="7.5" r="1.1"/>'; // 发簪

const view = document.getElementById('view');

/* 风格切换：选择只存本机浏览器（同主站键名，但不同域名不互通） */
const root = document.documentElement;
document.querySelector('.theme-toggle').addEventListener('click', (e) => {
	const next = root.dataset.theme === 'cyber' ? 'ink' : 'cyber';
	try { localStorage.setItem('ui-theme', next); } catch {}
	const swap = () => { root.dataset.theme = next; };
	if (!document.startViewTransition) {
		root.classList.add('theme-switching');
		swap();
		setTimeout(() => root.classList.remove('theme-switching'), 500);
		return;
	}
	const r = e.currentTarget.getBoundingClientRect(); // 从按钮位置圆形扩散
	root.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
	root.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
	root.classList.add('t-theme-vt');
	document.startViewTransition(swap).finished.finally(() => root.classList.remove('t-theme-vt'));
});

/* 动效：滚动浮现、点击涟漪、页头滚动状态（同主站 shell/theme.js） */
addEventListener('scroll', () => root.classList.toggle('t-scrolled', scrollY > 8), { passive: true });

const seen = new IntersectionObserver((entries) => {
	for (const { target, isIntersecting } of entries) if (isIntersecting) show(target);
}, { rootMargin: '0px 0px -6% 0px' });
function show(el) {
	if (el.classList.contains('t-in')) return;
	seen.unobserve(el);
	el.classList.add('t-in');
	// 浮现结束后去掉，恢复元素自身的悬停过渡
	setTimeout(() => { el.classList.remove('t-reveal', 't-in'); }, 950 + parseInt(el.style.getPropertyValue('--t-delay')));
}
function reveal() {
	for (const el of view.querySelectorAll('.portal,.field,.rates')) {
		el.style.setProperty('--t-delay', `${Math.min([...el.parentElement.children].indexOf(el), 6) * 40}ms`);
		el.classList.add('t-reveal');
		seen.observe(el);
	}
}
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

/* 页面 */
function renderHome() {
	view.innerHTML = `<div class="page-head"><h1><b class="page-ico">${svg(HOME_ICON)}</b>饰品铺子</h1><span class="count">${TOOLS.length}</span></div>` + groups.map((g) => `
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
	if (!tool) {
		renderHome();
		return reveal();
	}
	view.innerHTML = `<div class="page-head"><h1><b class="page-ico">${svg(tool.icon)}</b>${tool.name}</h1></div><div id="tool"></div>`;
	const [{ mount }] = await Promise.all([import(`./tools/${id}.js`), loadCss(id)]); // 进入时才加载
	if (currentId() !== id) return;
	unmount = mount(document.getElementById('tool'));
	reveal();
}

addEventListener('hashchange', () => { if (document.startViewTransition) document.startViewTransition(route); else route(); });
route();
