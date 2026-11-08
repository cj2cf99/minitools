import { GROUPS, TOOLS } from './tools/index.js';

const svg = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const inGroup = (group) => TOOLS.filter((t) => t.group === group.id);
const groups = GROUPS.filter((g) => inGroup(g).length);
const tone = (g) => `style="--tone:var(--t-${g.tone})"`;
const currentId = () => location.hash.replace(/^#\/?/, '');
const HOME_ICON = '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>';

const header = document.querySelector('header.unified-header');
const desktop = header.querySelector('.site-navigation');
const nav = desktop.querySelector('nav');
const toggle = header.querySelector('.site-menu-toggle');
const drawer = document.getElementById('site-drawer');
const view = document.getElementById('view');
const mobile = matchMedia('(max-width:767px)');

/* 导航：一棵链接树，桌面下拉与手机抽屉共用（同主站 shell/navigation.js） */
nav.innerHTML = `<div class="nav-home"><div class="nav-entry"><a data-nav="" href="#/">总览</a></div></div>` + groups.map((g) => `
	<details class="nav-group" data-nav-group="${g.id}" ${tone(g)}>
		<summary>${g.label}<span aria-hidden="true">⌄</span></summary>
		<div class="nav-dropdown">${inGroup(g).map((t) => `
			<div class="nav-entry"><a data-nav="${t.id}" href="#/${t.id}"><b class="tool-icon">${svg(t.icon)}</b>${t.name}<small>${t.desc}</small></a></div>`).join('')}
		</div>
	</details>`).join('');

const navGroups = [...nav.querySelectorAll('.nav-group')];
const closeGroups = () => navGroups.forEach((g) => { g.open = false; });
const closeDrawer = () => { if (drawer.open) drawer.close(); };

drawer.addEventListener('close', () => {
	desktop.append(nav);
	toggle.setAttribute('aria-expanded', 'false');
	closeGroups();
	if (mobile.matches) toggle.focus();
});
toggle.addEventListener('click', () => {
	drawer.querySelector('.drawer-body').append(nav);
	navGroups.forEach((g) => { g.open = true; });
	drawer.showModal();
	toggle.setAttribute('aria-expanded', 'true');
});
drawer.querySelector('.drawer-close').addEventListener('click', closeDrawer);
drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
navGroups.forEach((group) => group.querySelector('summary').addEventListener('click', (e) => {
	if (drawer.open) return e.preventDefault();
	navGroups.forEach((other) => { if (other !== group) other.open = false; });
}));
document.addEventListener('click', (e) => {
	if (!header.contains(e.target) && !drawer.contains(e.target)) closeGroups();
	if (e.target.closest('.nav-entry a')) { closeDrawer(); closeGroups(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.open) closeGroups(); });
mobile.addEventListener('change', () => { closeDrawer(); closeGroups(); });

/* 风格切换：选择只存本机浏览器（同主站键名，但不同域名不互通） */
header.querySelector('.theme-toggle').addEventListener('click', () => {
	const root = document.documentElement;
	root.dataset.theme = root.dataset.theme === 'ink' ? 'cyber' : 'ink';
	try { localStorage.setItem('ui-theme', root.dataset.theme); } catch {}
});

addEventListener('scroll', () => document.documentElement.classList.toggle('t-scrolled', scrollY > 8), { passive: true });

/* 页面 */
function markCurrent(id) {
	nav.querySelectorAll('[data-nav]').forEach((a) => {
		if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
		else a.removeAttribute('aria-current');
	});
	navGroups.forEach((g) => { g.dataset.current = String(!!g.querySelector('[aria-current]')); });
	nav.querySelector('.nav-home').dataset.current = String(id === '');
}

function renderHome() {
	view.innerHTML = `<div class="page-head"><h1><b class="page-ico">${svg(HOME_ICON)}</b>饰品总览</h1><span class="count">${TOOLS.length}</span></div>` + groups.map((g) => `
		<section class="tool-section" ${tone(g)}>
			<h2>${g.label}</h2>
			<div class="portals">${inGroup(g).map((t) => `
				<a class="portal" href="#/${t.id}">
					<b class="tool-icon">${svg(t.icon)}</b>
					<span class="portal-copy"><strong>${t.name}</strong><small>${t.desc}</small></span>
					<i class="enter" aria-hidden="true">${svg('<path d="M5 12h14M13 6l6 6-6 6"/>')}</i>
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
	closeGroups();
	markCurrent(tool ? id : '');
	document.title = tool ? `${tool.name} · 饰品库` : '饰品库';
	view.classList.remove('enter');
	void view.offsetWidth; // 重启入场动画
	view.classList.add('enter');
	if (!tool) return renderHome();
	view.innerHTML = `<div class="page-head"><h1><b class="page-ico">${svg(tool.icon)}</b>${tool.name}</h1></div><div id="tool"></div>`;
	const [{ mount }] = await Promise.all([import(`./tools/${id}.js`), loadCss(id)]); // 进入时才加载
	if (currentId() === id) unmount = mount(document.getElementById('tool'));
}

addEventListener('hashchange', route);
route();
