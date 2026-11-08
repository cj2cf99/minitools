// 工具注册表：页头下拉、手机抽屉、总览分区都由这里生成，没有工具的分类自动隐藏。
// 新增工具：在 TOOLS 加一项，并放 tools/<id>.js（导出 mount(el)，可返回卸载函数）和 tools/<id>.css。
export const GROUPS = [
	{ id: 'calc', label: '换算计算', tone: 'g2' },
];

export const TOOLS = [
	{
		id: 'fx',
		group: 'calc',
		name: '汇率速算',
		desc: '日元、美元、人民币即时互算。',
		icon: '<path d="M4 9h15l-4-4M20 15H5l4 4"/>',
	},
];
