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
];
