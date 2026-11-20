// 工具注册表：页面里的分类分区和卡片由这里生成，没有工具的分类自动隐藏。工具不上页头菜单。
// 新增工具：在 TOOLS 加一项，并放 tools/<id>.js（导出 mount(el)，可返回卸载函数）和 tools/<id>.css。
export const GROUPS = [
	{ id: 'calc', label: '实用工具', tone: 'g2' },
	{ id: 'games', label: '小游戏', tone: 'g3' },
];

export const TOOLS = [
	{
		id: 'fx',
		group: 'calc',
		name: '汇率速算',
		desc: '日元、美元、人民币即时互算。',
		icon: '<path d="M4 9h15l-4-4M20 15H5l4 4"/>',
	},
	{
		id: 'dice',
		group: 'games',
		name: '掷骰台',
		desc: '自定 3–30 的区间，掷出随机点数。',
		useHeadingIcon: true,
		icon: `<g class="dice-icon-spin">
			<g transform="rotate(-15 12 12)">
				<rect x="6" y="6" width="12" height="12" rx="2.75"/>
				<path d="M9 9h.01m3 3h.01m3 3h.01"/>
			</g>
		</g>
		<path d="M2.5 10a10 10 0 0 1 3-5.5m16 9.5a10 10 0 0 1-3 5.5" stroke-width="1.5"/>`,
	},
	{
		id: 'magiccard',
		href: 'tools/magiccard/',
		group: 'games',
		name: '月下秘仪',
		desc: '塔罗牌 · 与薇拉抽三张牌，听本局解读。',
		icon: `<path class="tarot-icon-back" d="m7 18-3 .7a1.5 1.5 0 0 1-1.8-1.2L.9 6a1.5 1.5 0 0 1 1.2-1.7l8.2-1.6a1.5 1.5 0 0 1 1.7 1.2"/>
			<g class="tarot-icon-front"><g transform="rotate(9 15 13)">
				<rect x="9" y="5" width="12" height="16" rx="2"/><path d="m15 9 2.5 4-2.5 4-2.5-4z"/>
			</g></g>`,
	},
	{
		id: 'sindie',
		href: 'tools/sindie/',
		group: 'games',
		name: '告解骰',
		desc: '七罪骰 · 在烛光祭坛上掷出一罪。',
		icon: `<path d="M4 22V11h4v11M2 22h21"/>
			<g class="sindie-icon-flame"><path d="M6 9c-1.3-1-1.3-3 0-5 1.3 2 1.3 4 0 5z"/></g>
			<g class="sindie-icon-dust"><path d="M10 21l-1.6-1.2M24 21l1.6-1.2" stroke-width="1.5"/></g>
			<g class="sindie-icon-air"><g class="sindie-icon-spin"><g class="sindie-icon-rock"><g class="sindie-icon-squash">
				<path d="M13 22h8l2-5-6-5-6 5z"/><path d="M11 17l6 2 6-2M17 12v7M17 19l-4 3m4-3 4 3"/>
			</g></g></g></g>`,
	},
];
