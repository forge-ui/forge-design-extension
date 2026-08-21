const thread = document.getElementById('thread');
const empty = document.getElementById('empty');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const composer = document.getElementById('composer');
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');
const sessionList = document.getElementById('sessionList');
const chatTitle = document.getElementById('chatTitle');
const pickBtn = document.getElementById('pickBtn');
const pickLabel = document.getElementById('pickLabel');
const pickThumb = document.getElementById('pickThumb');
const pickGroup = document.getElementById('pickGroup');
const pickExpandBtn = document.getElementById('pickExpandBtn');
const pickMenu = document.getElementById('pickMenu');
const pickModeElement = document.getElementById('pickModeElement');
const pickModeAnnotate = document.getElementById('pickModeAnnotate');
const clearPickBtn = document.getElementById('clearPickBtn');
const sessionEmpty = document.getElementById('sessionEmpty');
const sessionSearch = document.getElementById('sessionSearch');
const moreBtn = document.getElementById('moreBtn');
const moreMenu = document.getElementById('moreMenu');
const bridgeSwitch = document.getElementById('bridgeSwitch');
const bridgeState = document.getElementById('bridgeState');
const dirList = document.getElementById('dirList');
const dirNow = document.getElementById('dirNow');
const dirForm = document.getElementById('dirForm');
const dirInput = document.getElementById('dirInput');
const palette = document.getElementById('palette');
const paletteBtn = document.getElementById('paletteBtn');
const paletteBody = document.getElementById('paletteBody');
const paletteSearch = document.getElementById('paletteSearch');
const paletteEmpty = document.getElementById('paletteEmpty');
const placeBanner = document.getElementById('placeBanner');
const placeBannerText = document.getElementById('placeBannerText');
const commitPlaceBtn = document.getElementById('commitPlaceBtn');

const PALETTE_CATEGORIES = [
  { id: 'chrome', name: '壳' },
  { id: 'table', name: '表格' },
  { id: 'list', name: '列表' },
  { id: 'metric', name: '指标' },
  { id: 'chart', name: '图表' },
  { id: 'card', name: '卡片' },
  { id: 'form', name: '表单' },
  { id: 'social', name: '社交' },
  { id: 'calendar', name: '日历' },
  { id: 'action', name: '动作' },
  { id: 'foundation', name: '基础' },
];

const CHART_COLORS = ['purple', 'blue', 'green', 'red', 'orange', 'yellow', 'cyan'];
const CARD_THEMES = ['white', 'black', 'purple', 'blue', 'green', 'red', 'yellow', 'cyan'];

function vars(ids, prop) {
  return ids.map((id) => ({ id, hint: `${prop}="${id}"` }));
}

function one(id = 'default', hint = '') {
  return [{ id, hint }];
}

const FORGE_BLOCKS = [
  { id: 'app-layout', name: 'AppLayout', category: 'chrome', kind: 'layout', exportName: 'AppLayout', variants: vars(['light', 'dark'], 'mode') },
  { id: 'top-bar', name: 'TopBar', category: 'chrome', kind: 'header', exportName: 'TopBar', variants: one() },
  {
    id: 'page-header',
    name: 'PageHeader',
    category: 'chrome',
    kind: 'header',
    exportName: 'PageHeader',
    variants: [
      { id: 'title', hint: 'variant="title"' },
      { id: 'search', hint: 'variant="search"' },
    ],
  },
  {
    id: 'page-title-toolbar',
    name: 'PageTitleToolbar',
    category: 'chrome',
    kind: 'header',
    exportName: 'PageTitleToolbar',
    variants: vars(['overview', 'collection', 'detail', 'action'], 'variant'),
  },
  { id: 'toolbar', name: 'Toolbar', category: 'chrome', kind: 'filter', exportName: 'Toolbar', variants: one() },
  { id: 'toolbar-search', name: 'ToolbarSearchInput', category: 'chrome', kind: 'filter', exportName: 'ToolbarSearchInput', variants: one() },
  { id: 'toolbar-select', name: 'ToolbarSelectDropdown', category: 'chrome', kind: 'filter', exportName: 'ToolbarSelectDropdown', variants: one() },
  { id: 'toolbar-datepicker', name: 'ToolbarDatepicker', category: 'chrome', kind: 'filter', exportName: 'ToolbarDatepicker', variants: one() },
  { id: 'toolbar-filter', name: 'ToolbarFilterButton', category: 'chrome', kind: 'filter', exportName: 'ToolbarFilterButton', variants: one() },
  { id: 'toolbar-show', name: 'ToolbarShowSelect', category: 'chrome', kind: 'filter', exportName: 'ToolbarShowSelect', variants: one() },
  { id: 'toolbar-actions', name: 'ToolbarActions', category: 'chrome', kind: 'filter', exportName: 'ToolbarActions', variants: one() },
  { id: 'toolbar-kebab', name: 'ToolbarKebabButton', category: 'chrome', kind: 'iconbtn', exportName: 'ToolbarKebabButton', variants: one() },
  { id: 'toolbar-favorite', name: 'ToolbarFavoriteButton', category: 'chrome', kind: 'iconbtn', exportName: 'ToolbarFavoriteButton', variants: one() },
  { id: 'toolbar-pill-tabs', name: 'ToolbarPillTabs', category: 'chrome', kind: 'tabs', exportName: 'ToolbarPillTabs', variants: one() },
  { id: 'breadcrumbs', name: 'Breadcrumbs', category: 'chrome', kind: 'crumbs', exportName: 'Breadcrumbs', variants: one() },
  { id: 'sidebar-menu', name: 'SidebarMenu', category: 'chrome', kind: 'nav', exportName: 'SidebarMenu', variants: one() },
  {
    id: 'tab-bar',
    name: 'TabBar',
    category: 'chrome',
    kind: 'tabs',
    exportName: 'TabBar',
    variants: [
      { id: 'inline', hint: 'surface="inline"' },
      { id: 'page', hint: 'surface="page"' },
    ],
  },
  { id: 'pagination', name: 'Pagination', category: 'list', kind: 'pager', exportName: 'Pagination', variants: one() },
  { id: 'stepper', name: 'Stepper', category: 'list', kind: 'steps', exportName: 'Stepper', variants: one() },
  { id: 'page-dot', name: 'PageDot', category: 'list', kind: 'chip', exportName: 'PageDot', variants: one() },
  { id: 'data-table', name: 'DataTable', category: 'table', kind: 'table', exportName: 'DataTable', variants: one() },
  { id: 'full-width-table', name: 'FullWidthTable', category: 'table', kind: 'table', exportName: 'FullWidthTable', variants: one() },
  {
    id: 'table-cell',
    name: 'TableCell',
    category: 'table',
    kind: 'cell',
    exportName: 'TableCell',
    variants: [
      { id: 'body', hint: 'variant="body"' },
      { id: 'header', hint: 'variant="header"' },
    ],
  },
  { id: 'cell-text', name: 'CellText', category: 'table', kind: 'cell', exportName: 'CellText', variants: one() },
  { id: 'cell-text-subtitle', name: 'CellTextSubtitle', category: 'table', kind: 'cell', exportName: 'CellTextSubtitle', variants: one() },
  { id: 'cell-muted', name: 'CellMuted', category: 'table', kind: 'cell', exportName: 'CellMuted', variants: one() },
  { id: 'cell-image-text', name: 'CellImageText', category: 'table', kind: 'cell', exportName: 'CellImageText', variants: one() },
  {
    id: 'status-badge',
    name: 'StatusBadge',
    category: 'table',
    kind: 'cell',
    exportName: 'StatusBadge',
    variants: vars(['green', 'yellow', 'red', 'grey'], 'color'),
  },
  {
    id: 'progress-badge',
    name: 'ProgressBadge',
    category: 'table',
    kind: 'cell',
    exportName: 'ProgressBadge',
    variants: vars(['green', 'red', 'grey'], 'color'),
  },
  { id: 'cell-progress-value', name: 'CellProgressValue', category: 'table', kind: 'cell', exportName: 'CellProgressValue', variants: one() },
  { id: 'cell-kebab', name: 'CellKebabMenu', category: 'table', kind: 'cell', exportName: 'CellKebabMenu', variants: one() },
  { id: 'cell-status-dot', name: 'CellStatusDot', category: 'table', kind: 'cell', exportName: 'CellStatusDot', variants: one() },
  { id: 'cell-number', name: 'CellNumber', category: 'table', kind: 'cell', exportName: 'CellNumber', variants: one() },
  { id: 'cell-progress-bar', name: 'CellProgressBar', category: 'table', kind: 'cell', exportName: 'CellProgressBar', variants: one() },
  { id: 'cell-code', name: 'CellCode', category: 'table', kind: 'cell', exportName: 'CellCode', variants: one() },
  { id: 'cell-rating', name: 'CellRating', category: 'table', kind: 'cell', exportName: 'CellRating', variants: one() },
  { id: 'cell-file', name: 'CellFile', category: 'table', kind: 'cell', exportName: 'CellFile', variants: one() },
  { id: 'cell-actions', name: 'CellActions', category: 'table', kind: 'cell', exportName: 'CellActions', variants: one() },
  { id: 'cell-link', name: 'CellLink', category: 'table', kind: 'cell', exportName: 'CellLink', variants: one() },
  { id: 'list-group', name: 'ListGroup', category: 'list', kind: 'list', exportName: 'ListGroup', variants: one() },
  { id: 'list-item', name: 'ListItem', category: 'list', kind: 'list', exportName: 'ListItem', variants: one() },
  { id: 'description-item', name: 'DescriptionItem', category: 'list', kind: 'list', exportName: 'DescriptionItem', variants: one() },
  { id: 'filter-group', name: 'FilterGroup', category: 'list', kind: 'filter', exportName: 'FilterGroup', variants: one() },
  { id: 'filter-trigger', name: 'FilterTrigger', category: 'list', kind: 'filter', exportName: 'FilterTrigger', variants: one() },
  { id: 'filter-panel', name: 'FilterPanel', category: 'list', kind: 'filter', exportName: 'FilterPanel', variants: one() },
  {
    id: 'button-group',
    name: 'ButtonGroup',
    category: 'list',
    kind: 'filter',
    exportName: 'ButtonGroup',
    variants: [
      { id: 'pill', hint: 'shape="pill"' },
      { id: 'rounded', hint: 'shape="rounded"' },
    ],
  },
  {
    id: 'stat-card',
    name: 'StatCard',
    category: 'metric',
    kind: 'stat-plain',
    exportName: 'StatCard',
    variants: [
      { id: 'sm', hint: 'size="sm"' },
      { id: 'lg', hint: 'size="lg"' },
      { id: 'wide', hint: 'size="wide"' },
      ...vars(CARD_THEMES, 'theme'),
    ],
  },
  { id: 'progress-stat', name: 'ProgressStatCard', category: 'metric', kind: 'stat-bar', exportName: 'ProgressStatCard', variants: one() },
  { id: 'line-stat', name: 'LineChartStatCard', category: 'metric', kind: 'stat', exportName: 'LineChartStatCard', variants: vars(CHART_COLORS, 'chartColor') },
  { id: 'bar-stat', name: 'BarChartStatCard', category: 'metric', kind: 'stat-bar', exportName: 'BarChartStatCard', variants: vars(CHART_COLORS, 'chartColor') },
  { id: 'wheel-stat', name: 'WheelChartStatCard', category: 'metric', kind: 'stat-wheel', exportName: 'WheelChartStatCard', variants: vars(CHART_COLORS, 'chartColor') },
  { id: 'progress-bar', name: 'ProgressBar', category: 'metric', kind: 'bar', exportName: 'ProgressBar', variants: one() },
  { id: 'progress-card', name: 'ProgressCard', category: 'metric', kind: 'card', exportName: 'ProgressCard', variants: one() },
  { id: 'image-stat', name: 'ImageStatCard', category: 'metric', kind: 'card', exportName: 'ImageStatCard', variants: one() },
  { id: 'chart-card', name: 'ChartCard', category: 'chart', kind: 'chart', exportName: 'ChartCard', variants: one() },
  { id: 'chart-list-item', name: 'ChartListItem', category: 'chart', kind: 'list', exportName: 'ChartListItem', variants: one() },
  { id: 'chart-legend-item', name: 'ChartLegendItem', category: 'chart', kind: 'list', exportName: 'ChartLegendItem', variants: one() },
  { id: 'chart-value-row', name: 'ChartValueRow', category: 'chart', kind: 'list', exportName: 'ChartValueRow', variants: one() },
  { id: 'chart-stat-footer', name: 'ChartStatFooter', category: 'chart', kind: 'list', exportName: 'ChartStatFooter', variants: one() },
  { id: 'meter-chart', name: 'MeterChart', category: 'chart', kind: 'chart', exportName: 'MeterChart', variants: one() },
  { id: 'donut-chart', name: 'DonutChart', category: 'chart', kind: 'chart', exportName: 'DonutChart', variants: one() },
  { id: 'half-donut', name: 'HalfDonutChart', category: 'chart', kind: 'chart', exportName: 'HalfDonutChart', variants: one() },
  { id: 'dashed-half-donut', name: 'DashedHalfDonutChart', category: 'chart', kind: 'chart', exportName: 'DashedHalfDonutChart', variants: one() },
  { id: 'pie-chart', name: 'PieChart', category: 'chart', kind: 'chart', exportName: 'PieChart', variants: one() },
  { id: 'multi-donut', name: 'MultilayerDonutChart', category: 'chart', kind: 'chart', exportName: 'MultilayerDonutChart', variants: one() },
  { id: 'bubble-chart', name: 'BubbleChart', category: 'chart', kind: 'chart', exportName: 'BubbleChart', variants: one() },
  { id: 'bar-chart', name: 'BarChart', category: 'chart', kind: 'stat-bar', exportName: 'BarChart', variants: one() },
  { id: 'bar-h-chart', name: 'BarHorizontalChart', category: 'chart', kind: 'stat-bar', exportName: 'BarHorizontalChart', variants: one() },
  { id: 'bar-up-chart', name: 'BarUpsideDownChart', category: 'chart', kind: 'stat-bar', exportName: 'BarUpsideDownChart', variants: one() },
  { id: 'smooth-line', name: 'SmoothLineChart', category: 'chart', kind: 'chart', exportName: 'SmoothLineChart', variants: one() },
  { id: 'surface-card', name: 'SurfaceCard', category: 'card', kind: 'card', exportName: 'SurfaceCard', variants: vars(['none', 'sm', 'md', 'lg'], 'padding') },
  { id: 'project-card', name: 'ProjectCard', category: 'card', kind: 'card', exportName: 'ProjectCard', variants: one() },
  { id: 'task-card', name: 'TaskCard', category: 'card', kind: 'card', exportName: 'TaskCard', variants: one() },
  { id: 'user-card', name: 'UserCard', category: 'card', kind: 'card', exportName: 'UserCard', variants: one() },
  { id: 'balance-card', name: 'BalanceCard', category: 'card', kind: 'card', exportName: 'BalanceCard', variants: one() },
  { id: 'debit-card', name: 'DebitCard', category: 'card', kind: 'card', exportName: 'DebitCard', variants: one() },
  { id: 'credit-card', name: 'CreditCard', category: 'card', kind: 'card', exportName: 'CreditCard', variants: one() },
  { id: 'highlight-card', name: 'HighlightCard', category: 'card', kind: 'card', exportName: 'HighlightCard', variants: one() },
  { id: 'activity-card', name: 'ActivityCard', category: 'card', kind: 'card', exportName: 'ActivityCard', variants: one() },
  { id: 'profile-card', name: 'ProfileCard', category: 'card', kind: 'card', exportName: 'ProfileCard', variants: one() },
  { id: 'map-card', name: 'MapCard', category: 'card', kind: 'card', exportName: 'MapCard', variants: vars(['sm', 'md', 'lg'], 'variant') },
  { id: 'product-row', name: 'ProductRow', category: 'card', kind: 'list', exportName: 'ProductRow', variants: one() },
  {
    id: 'text-field',
    name: 'TextField',
    category: 'form',
    kind: 'field',
    exportName: 'TextField',
    variants: [
      { id: 'rounded', hint: 'shape="rounded"' },
      { id: 'pill', hint: 'shape="pill"' },
    ],
  },
  { id: 'text-field-select-suffix', name: 'TextFieldSelectSuffix', category: 'form', kind: 'field', exportName: 'TextFieldSelectSuffix', variants: one() },
  {
    id: 'text-area',
    name: 'TextArea',
    category: 'form',
    kind: 'area',
    exportName: 'TextArea',
    variants: [
      { id: 'rounded', hint: 'shape="rounded"' },
      { id: 'pill', hint: 'shape="pill"' },
    ],
  },
  {
    id: 'select-option',
    name: 'SelectOption',
    category: 'form',
    kind: 'select',
    exportName: 'SelectOption',
    variants: vars(['general', 'single', 'multiple', 'image'], 'type'),
  },
  {
    id: 'datepicker',
    name: 'Datepicker',
    category: 'form',
    kind: 'field',
    exportName: 'Datepicker',
    variants: [
      { id: 'single', hint: 'mode="single"' },
      { id: 'range', hint: 'mode="range"' },
    ],
  },
  { id: 'toggle', name: 'Toggle', category: 'form', kind: 'toggle', exportName: 'Toggle', variants: one() },
  { id: 'radio', name: 'RadioWithLabel', category: 'form', kind: 'check', exportName: 'RadioWithLabel', extras: ['RadioButton'], variants: one() },
  { id: 'checkbox', name: 'CheckboxWithLabel', category: 'form', kind: 'check', exportName: 'CheckboxWithLabel', extras: ['Checkbox', 'CheckboxControl'], variants: one() },
  { id: 'file-upload', name: 'FileUpload', category: 'form', kind: 'upload', exportName: 'FileUpload', extras: ['FileCard'], variants: one() },
  { id: 'file-card', name: 'FileCard', category: 'form', kind: 'upload', exportName: 'FileCard', variants: one() },
  { id: 'media-upload', name: 'MediaUpload', category: 'form', kind: 'upload', exportName: 'MediaUpload', variants: one() },
  { id: 'profile-upload', name: 'ProfileImgUpload', category: 'form', kind: 'avatar', exportName: 'ProfileImgUpload', variants: one() },
  { id: 'icon-picker', name: 'IconPicker', category: 'form', kind: 'field', exportName: 'IconPicker', extras: ['IconSelector'], variants: one() },
  { id: 'icon-selector', name: 'IconSelector', category: 'form', kind: 'field', exportName: 'IconSelector', variants: one() },
  { id: 'color-picker', name: 'ColorPicker', category: 'form', kind: 'field', exportName: 'ColorPicker', variants: one() },
  { id: 'contact-item', name: 'ContactItem', category: 'social', kind: 'list', exportName: 'ContactItem', variants: one() },
  { id: 'chat-bubble', name: 'ChatBubble', category: 'social', kind: 'chat', exportName: 'ChatBubble', variants: one() },
  { id: 'chat-input', name: 'ChatInputBar', category: 'social', kind: 'field', exportName: 'ChatInputBar', variants: one() },
  { id: 'comment-item', name: 'CommentItem', category: 'social', kind: 'list', exportName: 'CommentItem', variants: one() },
  {
    id: 'review-item',
    name: 'ReviewItem',
    category: 'social',
    kind: 'list',
    exportName: 'ReviewItem',
    variants: [
      { id: 'card', hint: 'variant="card"' },
      { id: 'regular', hint: 'variant="regular"' },
    ],
  },
  { id: 'notification-item', name: 'NotificationItem', category: 'social', kind: 'list', exportName: 'NotificationItem', variants: one() },
  {
    id: 'history-item',
    name: 'HistoryItem',
    category: 'social',
    kind: 'list',
    exportName: 'HistoryItem',
    variants: vars(['regular', 'badge', 'profile'], 'variant'),
  },
  { id: 'history-grouped', name: 'HistoryGrouped', category: 'social', kind: 'list', exportName: 'HistoryGrouped', variants: one() },
  { id: 'avatar', name: 'Avatar', category: 'social', kind: 'avatar', exportName: 'Avatar', variants: one() },
  { id: 'avatar-group', name: 'AvatarGroup', category: 'social', kind: 'avatar', exportName: 'AvatarGroup', variants: one() },
  {
    id: 'label',
    name: 'Label',
    category: 'social',
    kind: 'chip',
    exportName: 'Label',
    variants: [
      { id: 'outline', hint: 'variant="outline"' },
      { id: 'solid', hint: 'variant="solid"' },
    ],
  },
  { id: 'badge', name: 'NotificationBadge', category: 'social', kind: 'chip', exportName: 'NotificationBadge', variants: one() },
  {
    id: 'circle-icon',
    name: 'CircleIcon',
    category: 'foundation',
    kind: 'chip',
    exportName: 'CircleIcon',
    variants: [
      { id: 'solid', hint: 'variant="solid"' },
      { id: 'light', hint: 'variant="light"' },
      { id: 'neutral', hint: 'variant="neutral"' },
    ],
  },
  {
    id: 'artistic-icon',
    name: 'ArtisticIcon',
    category: 'foundation',
    kind: 'chip',
    exportName: 'ArtisticIcon',
    variants: [
      { id: 'gradient', hint: 'variant="gradient"' },
      { id: 'orbs', hint: 'variant="orbs"' },
    ],
  },
  { id: 'file-type-icon', name: 'FileTypeIcon', category: 'foundation', kind: 'chip', exportName: 'FileTypeIcon', variants: one() },
  { id: 'color-swatch', name: 'ColorSwatch', category: 'foundation', kind: 'chip', exportName: 'ColorSwatch', variants: one() },
  { id: 'color-section', name: 'ColorSection', category: 'foundation', kind: 'card', exportName: 'ColorSection', variants: one() },
  { id: 'typeface-block', name: 'TypefaceBlock', category: 'foundation', kind: 'card', exportName: 'TypefaceBlock', variants: one() },
  { id: 'typography-weight', name: 'TypographyWeightSample', category: 'foundation', kind: 'chip', exportName: 'TypographyWeightSample', variants: one() },
  { id: 'typography-size', name: 'TypographySizeRow', category: 'foundation', kind: 'card', exportName: 'TypographySizeRow', variants: one() },
  { id: 'small-calendar', name: 'SmallCalendar', category: 'calendar', kind: 'cal', exportName: 'SmallCalendar', variants: one() },
  { id: 'daily-calendar', name: 'SmallDailyCalendar', category: 'calendar', kind: 'cal', exportName: 'SmallDailyCalendar', variants: one() },
  { id: 'full-calendar', name: 'FullCalendar', category: 'calendar', kind: 'cal', exportName: 'FullCalendar', variants: one() },
  { id: 'event-card', name: 'EventCard', category: 'calendar', kind: 'card', exportName: 'EventCard', variants: one() },
  { id: 'event-tag', name: 'EventTag', category: 'calendar', kind: 'chip', exportName: 'EventTag', variants: one() },
  { id: 'calendar-day-cell', name: 'CalendarDayCell', category: 'calendar', kind: 'cal', exportName: 'CalendarDayCell', variants: one() },
  { id: 'calendar-week-row', name: 'CalendarWeekRow', category: 'calendar', kind: 'cal', exportName: 'CalendarWeekRow', variants: one() },
  {
    id: 'button',
    name: 'Button',
    category: 'action',
    kind: 'button',
    exportName: 'Button',
    variants: [
      { id: 'primary', hint: 'variant="primary"' },
      { id: 'secondary', hint: 'variant="secondary"' },
      { id: 'tertiary', hint: 'variant="tertiary"' },
    ],
  },
  {
    id: 'icon-button',
    name: 'IconButton',
    category: 'action',
    kind: 'iconbtn',
    exportName: 'IconButton',
    variants: [
      { id: 'primary', hint: 'variant="primary"' },
      { id: 'secondary', hint: 'variant="secondary"' },
      { id: 'tertiary', hint: 'variant="tertiary"' },
      { id: 'ghost', hint: 'variant="ghost"' },
    ],
  },
  { id: 'styled-link', name: 'StyledLink', category: 'action', kind: 'link', exportName: 'StyledLink', variants: one() },
  {
    id: 'confirm-dialog',
    name: 'ConfirmationDialog',
    category: 'action',
    kind: 'dialog',
    exportName: 'ConfirmationDialog',
    variants: [
      { id: 'purple', hint: 'color="purple" layout="spread"' },
      { id: 'red', hint: 'color="red" layout="spread"' },
      { id: 'green', hint: 'color="green" layout="spread"' },
      { id: 'yellow', hint: 'color="yellow" layout="spread"' },
      { id: 'blue', hint: 'color="blue" layout="spread"' },
      { id: 'right', hint: 'color="purple" layout="right"' },
    ],
  },
  { id: 'tooltip', name: 'Tooltip', category: 'action', kind: 'chip', exportName: 'Tooltip', extras: ['TooltipBubble', 'TooltipAnchor'], variants: one() },
  { id: 'dropdown', name: 'DropdownPanel', category: 'action', kind: 'menu', exportName: 'DropdownPanel', extras: ['DropdownDivider'], variants: one() },
  { id: 'kebab-menu', name: 'KebabMenu', category: 'action', kind: 'menu', exportName: 'KebabMenu', variants: one() },
  { id: 'menu-item', name: 'MenuItem', category: 'action', kind: 'menu', exportName: 'MenuItem', variants: one() },
  { id: 'icon-trigger', name: 'IconTrigger', category: 'action', kind: 'iconbtn', exportName: 'IconTrigger', variants: one() },
  { id: 'currency', name: 'CurrencyConverter', category: 'action', kind: 'card', exportName: 'CurrencyConverter', variants: one() },
  { id: 'rating', name: 'RatingStars', category: 'action', kind: 'chip', exportName: 'RatingStars', variants: one() },
  { id: 'image-grid', name: 'ImageGrid', category: 'card', kind: 'card', exportName: 'ImageGrid', variants: one() },
];

let port = 3847;
let token = '';
let sessions = [];
let directories = [];
let currentCwd = '';
let current = { id: null, cwd: null, title: '新对话', messages: [] };
let includePick = false;
let lastPick = null;
let includeAnnotate = false;
let lastAnnotate = null;
let annotatePending = false;
let lastPlace = null;
let placing = null;
let pendingPlaces = [];
let handledPlaceAt = '';
let sending = false;
let sendGeneration = 0;
let messageQueue = [];
let queueSeq = 0;
let stickToBottom = true;
let lastThreadScrollTop = 0;
let ignoreThreadScroll = false;
let activeAbort = null;

const SEND_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M12 20V4m0 0 6 6m-6-6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STOP_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor"/></svg>';

function folderName(dir) {
  if (!dir) return '';
  return dir.split('/').filter(Boolean).pop() || dir;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeMarkdown(html) {
  const allowed = new Set([
    'A', 'P', 'BR', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 'SPAN',
    'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
  ]);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.querySelectorAll('*').forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (node.tagName === 'A' && name === 'href' && /^(https?:|mailto:|#)/i.test(attr.value)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noreferrer');
        return;
      }
      node.removeAttribute(attr.name);
    });
  });
  return wrap.innerHTML;
}

function formatText(text, asMarkdown) {
  if (!asMarkdown || typeof marked === 'undefined') {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  const html = marked.parse(String(text || ''), {
    gfm: true,
    breaks: true,
  });
  return sanitizeMarkdown(html);
}

function apiUrl(pathname) {
  return `http://127.0.0.1:${port}${pathname}`;
}

async function api(pathname, options = {}) {
  const res = await fetch(apiUrl(pathname), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function formatWorkedFor(ms) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `思考了${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `思考了${minutes}分${rest}秒` : `思考了${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes ? `思考了${hours}小时${remainMinutes}分` : `思考了${hours}小时`;
}

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return '';
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes ? `${hours}小时${remainMinutes}分` : `${hours}小时`;
}

let turnActivity = null;

function clearTurnActivity() {
  if (turnActivity?.timer) clearInterval(turnActivity.timer);
  turnActivity = null;
}

function startTurnActivity() {
  clearTurnActivity();
  turnActivity = {
    startedAt: Date.now(),
    current: { label: '思考中', verb: 'think' },
    trail: [],
    tools: new Map(),
    reads: new Set(),
    edits: 0,
    seen: new Set(),
    timer: setInterval(() => patchActivityDom(), 1000),
  };
}

function pushTrail(label) {
  if (!turnActivity || !label) return;
  const last = turnActivity.trail[turnActivity.trail.length - 1];
  if (last === label) return;
  turnActivity.trail.push(label);
  if (turnActivity.trail.length > 6) turnActivity.trail.shift();
}

function rememberTool(item) {
  if (!turnActivity || !item || item.verb === 'think') return;
  const key = item.id || `${item.verb}:${item.label}`;
  if (turnActivity.seen.has(key)) return;
  turnActivity.seen.add(key);
  if (item.verb === 'read') {
    const file = String(item.label || '').replace(/^读取 /, '') || key;
    turnActivity.reads.add(file);
  } else if (item.verb === 'edit') {
    turnActivity.edits += 1;
  }
}

function formatActivitySummary(activity) {
  if (!activity) return '';
  const parts = [];
  if (activity.reads.size) parts.push(`读了 ${activity.reads.size} 个文件`);
  if (activity.edits) parts.push(`改了 ${activity.edits} 处`);
  return parts.join(' · ');
}

function snapshotActivitySummary() {
  if (!turnActivity) return '';
  if (turnActivity.current?.verb && turnActivity.current.verb !== 'think') {
    rememberTool(turnActivity.current);
  }
  return formatActivitySummary(turnActivity);
}

function applyActivityEvent(event) {
  if (!turnActivity || event?.type !== 'activity') return;
  if (event.verb === 'think') {
    if (turnActivity.current?.verb && turnActivity.current.verb !== 'think') return;
    turnActivity.current = { label: '思考中', verb: 'think' };
    patchActivityDom();
    return;
  }
  const status = event.status || 'in_progress';
  const done = status === 'completed' || status === 'failed';
  const prev = (event.id && turnActivity.tools.get(event.id)) || {};
  const item = {
    id: event.id,
    label: event.label || prev.label || (turnActivity.current?.id === event.id ? turnActivity.current.label : ''),
    verb: event.verb || prev.verb || (turnActivity.current?.id === event.id ? turnActivity.current.verb : ''),
    status,
  };
  if (item.id) turnActivity.tools.set(item.id, item);
  if (done) {
    rememberTool(item);
    if (item.label) pushTrail(item.label);
    if (!event.id || turnActivity.current?.id === event.id) {
      turnActivity.current = { label: '思考中', verb: 'think' };
    }
    patchActivityDom();
    return;
  }
  if (turnActivity.current?.verb && turnActivity.current.verb !== 'think' && turnActivity.current.id !== item.id) {
    if (turnActivity.current.label) pushTrail(turnActivity.current.label);
  }
  turnActivity.current = item.label ? item : { ...item, label: turnActivity.current?.label || '思考中' };
  patchActivityDom();
}

function patchActivityDom() {
  const el = thread.querySelector('.msg.assistant.pending, .msg.assistant.streaming');
  if (!el || !turnActivity) return;
  const labelEl = el.querySelector('.thinking-label');
  const elapsedEl = el.querySelector('.thinking-elapsed');
  const trailEl = el.querySelector('.activity-trail');
  const label = turnActivity.current?.label || '思考中';
  if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
  if (elapsedEl) elapsedEl.textContent = formatElapsed(Date.now() - turnActivity.startedAt);
  if (trailEl) {
    const streaming = el.classList.contains('streaming');
    const items = turnActivity.trail;
    trailEl.hidden = streaming || items.length === 0;
    if (!trailEl.hidden) {
      const key = items.join('\n');
      if (trailEl.dataset.key !== key) {
        trailEl.dataset.key = key;
        trailEl.replaceChildren(
          ...items.map((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            return li;
          }),
        );
      }
    }
  }
  syncThreadScroll();
}

function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stampAssistantMeta(messages, startedAt, summary) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant' && !messages[index].pending) {
      messages[index].workedMs = Date.now() - startedAt;
      messages[index].at = new Date().toISOString();
      if (summary) messages[index].workSummary = summary;
      return;
    }
  }
}

function workLine(msg) {
  const parts = [];
  if (msg.workedMs != null) parts.push(formatWorkedFor(msg.workedMs));
  if (msg.workSummary) parts.push(msg.workSummary);
  return parts.join(' · ');
}

function renderThinking(el) {
  el.className = 'msg assistant pending';
  const label = turnActivity?.current?.label || '思考中';
  const elapsed = turnActivity ? formatElapsed(Date.now() - turnActivity.startedAt) : '';
  const trail = turnActivity?.trail || [];
  const trailItems = trail.map((text) => `<li>${escapeHtml(text)}</li>`).join('');
  el.innerHTML =
    `<div class="thinking"><canvas class="thinking-orb" width="22" height="22"></canvas><span class="thinking-copy"><span class="thinking-label">${escapeHtml(label)}</span><span class="thinking-dots"></span></span><span class="thinking-elapsed">${escapeHtml(elapsed)}</span></div><ul class="activity-trail"${trail.length ? '' : ' hidden'}>${trailItems}</ul>`;
  const canvas = el.querySelector('canvas');
  if (canvas && window.startThinkingOrb) window.startThinkingOrb(canvas, 22, 'composing');
}

function renderAssistant(el, msg) {
  el.className = 'msg assistant';
  const line = workLine(msg);
  const work = line
    ? `<div class="msg-work">${escapeHtml(line)}</div>`
    : '';
  const time = msg.at
    ? `<span class="msg-time">${escapeHtml(formatMessageTime(msg.at))}</span>`
    : '';
  el.innerHTML = `${work}<div class="msg-body">${formatText(msg.text, true)}</div><div class="msg-foot"><button class="msg-copy" type="button" title="复制"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 11c0-2.828 0-4.243.879-5.121C7.757 5 9.172 5 12 5h3c2.828 0 4.243 0 5.121.879C21 6.757 21 8.172 21 11v5c0 2.828 0 4.243-.879 5.121C19.243 22 17.828 22 15 22h-3c-2.828 0-4.243 0-5.121-.879C6 20.243 6 18.828 6 16z" stroke="currentColor" stroke-width="1.5"/><path d="M6 19a3 3 0 0 1-3-3v-6c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h4a3 3 0 0 1 3 3" stroke="currentColor" stroke-width="1.5"/></svg></button>${time}</div>`;
  const copyBtn = el.querySelector('.msg-copy');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(msg.text || '');
      copyBtn.title = '已复制';
    } catch {
      copyBtn.title = '复制失败';
    }
  });
}

function pickChipLabel(pick) {
  return [pick?.tag, pick?.text || pick?.selector].filter(Boolean).join(' · ');
}

function renderUser(el, msg) {
  el.className = 'msg user';
  el.replaceChildren();
  if (msg.text) {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = formatText(msg.text, false);
    el.appendChild(bubble);
  }
  const hasShot = !!msg.screenshot;
  const hasPick = !!(msg.pick?.selector && msg.screenshotKind !== 'annotate');
  if (!hasShot && !hasPick) return;
  const attach = document.createElement('div');
  attach.className = 'msg-attach';
  if (hasShot) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-shot-btn';
    btn.title = '查看大图';
    const img = document.createElement('img');
    img.className = 'msg-shot';
    img.alt = msg.screenshotKind === 'annotate' ? '截图标注' : '选中元素';
    img.src = msg.screenshot;
    btn.appendChild(img);
    btn.addEventListener('click', () => openShotPreview(msg.screenshot, img.alt));
    attach.appendChild(btn);
  }
  if (hasPick) {
    const chip = document.createElement('div');
    chip.className = 'msg-pick';
    chip.textContent = pickChipLabel(msg.pick);
    attach.appendChild(chip);
  }
  el.appendChild(attach);
}

function openShotPreview(src, alt) {
  const root = document.getElementById('shotPreview');
  const img = document.getElementById('shotPreviewImg');
  if (!root || !img || !src) return;
  img.src = src;
  img.alt = alt || '截图预览';
  root.hidden = false;
}

function closeShotPreview() {
  const root = document.getElementById('shotPreview');
  const img = document.getElementById('shotPreviewImg');
  if (!root) return;
  root.hidden = true;
  if (img) {
    img.removeAttribute('src');
    img.alt = '截图预览';
  }
}

function renderMessages() {
  const prevScroll = thread.scrollTop;
  thread.querySelectorAll('.msg').forEach((node) => node.remove());
  empty.hidden = current.messages.length > 0;
  for (const msg of current.messages) {
    const el = document.createElement('div');
    if (msg.pending && msg.role === 'assistant') {
      renderThinking(el);
    } else if (msg.role === 'assistant') {
      renderAssistant(el, msg);
    } else {
      renderUser(el, msg);
    }
    thread.appendChild(el);
  }
  if (stickToBottom) {
    syncThreadScroll();
    return;
  }
  thread.scrollTop = prevScroll;
  lastThreadScrollTop = thread.scrollTop;
  syncJumpLatest();
}

function isThreadNearBottom() {
  return thread.scrollHeight - thread.scrollTop - thread.clientHeight < 8;
}

function syncJumpLatest() {
  const jumpLatest = document.getElementById('jumpLatest');
  if (jumpLatest) {
    jumpLatest.hidden = stickToBottom || current.messages.length === 0;
  }
}

function syncThreadScroll() {
  if (stickToBottom) {
    const maxScroll = Math.max(0, thread.scrollHeight - thread.clientHeight);
    if (Math.abs(thread.scrollTop - maxScroll) > 1) {
      ignoreThreadScroll = true;
      thread.scrollTop = maxScroll;
    }
    lastThreadScrollTop = thread.scrollTop;
  }
  syncJumpLatest();
}

// Stream paint: coalesce tokens to one frame, plain text only (no marked/sanitize per token).
let streamPaintText = '';
let streamPaintRaf = 0;
let streamBodyEl = null;

function placeActivityUnderBody(el, body) {
  const thinking = el.querySelector('.thinking');
  if (!thinking) return;
  thinking.classList.add('thinking-compact');
  if (body.nextElementSibling !== thinking) {
    body.insertAdjacentElement('afterend', thinking);
  }
  const trail = el.querySelector('.activity-trail');
  if (trail) {
    trail.hidden = true;
    if (thinking.nextElementSibling !== trail) {
      thinking.insertAdjacentElement('afterend', trail);
    }
  }
}

function ensureStreamingBody() {
  if (streamBodyEl?.isConnected) return streamBodyEl;
  let el = thread.querySelector('.msg.assistant.streaming');
  if (!el) {
    el = thread.querySelector('.msg.assistant.pending');
    if (!el) return null;
    el.className = 'msg assistant streaming';
  }
  let body = el.querySelector('.msg-body');
  if (!body) {
    body = document.createElement('div');
    body.className = 'msg-body stream-plain';
    el.appendChild(body);
  }
  placeActivityUnderBody(el, body);
  streamBodyEl = body;
  return streamBodyEl;
}

function paintStreamingFrame() {
  streamPaintRaf = 0;
  const pending = current.messages.find((msg) => msg.role === 'assistant' && msg.pending);
  if (pending) pending.text = streamPaintText;
  const body = ensureStreamingBody();
  if (!body) return;
  // textContent + pre-wrap: O(1) DOM write, no markdown reparse / layout thrash
  if (body.textContent !== streamPaintText) {
    body.textContent = streamPaintText;
  }
  syncThreadScroll();
}

function updateStreamingText(text) {
  streamPaintText = text;
  if (streamPaintRaf) return;
  streamPaintRaf = requestAnimationFrame(paintStreamingFrame);
}

function flushStreamingPaint() {
  if (streamPaintRaf) {
    cancelAnimationFrame(streamPaintRaf);
    streamPaintRaf = 0;
  }
  if (streamPaintText) paintStreamingFrame();
  streamBodyEl = null;
  streamPaintText = '';
}

function renderPickChip() {
  const annotateOn = !!(includeAnnotate && lastAnnotate?.screenshot);
  const pickOn = !!(includePick && lastPick?.selector);
  const active = annotateOn || pickOn || annotatePending;
  pickBtn.classList.toggle('active', active);
  pickGroup.classList.toggle('active', active);
  pickGroup.classList.toggle('has-thumb', annotateOn);
  pickModeElement.classList.toggle('is-current', pickOn || (!annotateOn && !annotatePending));
  pickModeAnnotate.classList.toggle('is-current', annotateOn || annotatePending);
  if (annotateOn) {
    pickThumb.hidden = false;
    pickThumb.src = lastAnnotate.screenshot;
  } else {
    pickThumb.hidden = true;
    pickThumb.removeAttribute('src');
  }
  if (annotatePending && !annotateOn) {
    pickLabel.textContent = '框选中…';
    clearPickBtn.hidden = true;
    return;
  }
  if (!active) {
    pickLabel.textContent = '选择元素';
    clearPickBtn.hidden = true;
    return;
  }
  if (annotateOn) {
    pickLabel.textContent = '截图标注';
    clearPickBtn.hidden = false;
    return;
  }
  pickLabel.textContent = pickChipLabel(lastPick);
  clearPickBtn.hidden = false;
}

function closePickMenu() {
  pickMenu.hidden = true;
  pickExpandBtn.setAttribute('aria-expanded', 'false');
  pickGroup.classList.remove('open');
}

function clearPageTarget() {
  includePick = false;
  lastPick = null;
  includeAnnotate = false;
  lastAnnotate = null;
  annotatePending = false;
  renderPickChip();
}

function placePickFromOptions(options = {}) {
  return (
    options.places?.[0]?.pick ||
    options.place?.pick ||
    options.place?.places?.[0]?.pick ||
    null
  );
}

function takeComposerAttachments(options = {}) {
  if (options.screenshot || options.pick?.selector) {
    clearPageTarget();
    return {
      pick: options.pick?.selector ? options.pick : null,
      screenshot: options.screenshot || null,
      screenshotKind: options.screenshotKind || null,
      screenshotNotes: options.screenshotNotes || null,
    };
  }
  const annotateOn = !!(includeAnnotate && lastAnnotate?.screenshot);
  const pickOn = !!(includePick && lastPick?.selector);
  const attachments = {
    pick: pickOn ? lastPick : placePickFromOptions(options),
    screenshot: annotateOn ? lastAnnotate.screenshot : null,
    screenshotKind: annotateOn ? 'annotate' : null,
    screenshotNotes: annotateOn && Array.isArray(lastAnnotate.notes) ? lastAnnotate.notes : null,
  };
  clearPageTarget();
  return attachments;
}

const sessionAttachments = new Map();

function rememberSessionAttachments(sessionId, messages) {
  if (!sessionId) return;
  const items = (messages || [])
    .filter((msg) => msg.role === 'user' && (msg.screenshot || msg.pick))
    .map((msg) => ({
      text: msg.text,
      pick: msg.pick || null,
      screenshot: msg.screenshot || null,
      screenshotKind: msg.screenshotKind || null,
    }));
  if (items.length) sessionAttachments.set(sessionId, items);
  else sessionAttachments.delete(sessionId);
}

function patchLatestUser(patch) {
  for (let index = current.messages.length - 1; index >= 0; index -= 1) {
    const msg = current.messages[index];
    if (msg.role !== 'user') continue;
    if (patch.pick) msg.pick = patch.pick;
    if (patch.screenshot) msg.screenshot = patch.screenshot;
    if (patch.screenshotKind) msg.screenshotKind = patch.screenshotKind;
    rememberSessionAttachments(current.id, current.messages);
    return;
  }
}

function mergeUserAttachments(nextMessages, prevMessages) {
  const prevUsers = (prevMessages || []).filter(
    (msg) => msg.role === 'user' && (msg.screenshot || msg.pick)
  );
  if (!prevUsers.length) return nextMessages || [];
  const nextUsers = (nextMessages || []).filter((msg) => msg.role === 'user');
  let prevIndex = prevUsers.length - 1;
  for (let index = nextUsers.length - 1; index >= 0 && prevIndex >= 0; index -= 1) {
    const next = nextUsers[index];
    const prev = prevUsers[prevIndex];
    if (next.text !== prev.text) continue;
    if (!next.screenshot && prev.screenshot) next.screenshot = prev.screenshot;
    if (!next.screenshotKind && prev.screenshotKind) next.screenshotKind = prev.screenshotKind;
    if (!next.pick && prev.pick) next.pick = prev.pick;
    prevIndex -= 1;
  }
  return nextMessages || [];
}

function applyAnnotate(annotate) {
  if (!annotate?.screenshot) return;
  lastAnnotate = annotate;
  includeAnnotate = true;
  includePick = false;
  lastPick = null;
  annotatePending = false;
  renderPickChip();
}

function startPick() {
  includeAnnotate = false;
  lastAnnotate = null;
  annotatePending = false;
  renderPickChip();
  chrome.runtime.sendMessage({ type: 'startPick' }, () => {
    void chrome.runtime.lastError;
  });
}

function startAnnotate() {
  includePick = false;
  lastPick = null;
  annotatePending = true;
  renderPickChip();
  chrome.runtime.sendMessage({ type: 'startAnnotate' }, (res) => {
    void chrome.runtime.lastError;
    annotatePending = false;
    if (res?.error) {
      renderPickChip();
      current.messages.push({ role: 'assistant', text: `无法开始截图标注：${res.error}` });
      renderMessages();
      return;
    }
    if (res?.screenshot) {
      applyAnnotate(res);
      return;
    }
    renderPickChip();
  });
}

const KIT_HREF = 'vendor/forge-kit.css';

function mountForgePreview(host, spec) {
  const shadow = host.attachShadow({ mode: 'open' });
  const stage = document.createElement('div');
  shadow.append(stage);
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    io.disconnect();
    const api = window.ForgePalette;
    if (!api?.mount) {
      stage.textContent = spec.exportName || spec.name || 'Forge';
      return;
    }
    Promise.resolve(api.adoptKit ? api.adoptKit(shadow, KIT_HREF) : null).then(() => {
      api.mount(stage, spec);
    });
  }, { rootMargin: '200px' });
  io.observe(host);
}

const KIND_ALIASES = {
  table: '表格 表',
  cell: '单元格 格子 单元格组件',
  button: '按钮',
  iconbtn: '图标按钮',
  card: '卡片',
  field: '输入框 表单',
  area: '文本域',
  select: '下拉 选择',
  chart: '图表',
  layout: '布局 壳',
  list: '列表',
  chip: '标签 徽章 图标',
  dialog: '对话框 弹窗',
  cal: '日历',
  nav: '导航 侧栏',
  header: '顶栏 页头',
  filter: '筛选 工具栏 toolbar 搜索',
  menu: '菜单',
  pager: '分页',
  tabs: '标签页',
  toggle: '开关',
  upload: '上传 文件',
  avatar: '头像',
  link: '链接',
  foundation: '基础 色板 字体 style guide',
};

function blockSearchText(block) {
  const cat = PALETTE_CATEGORIES.find((item) => item.id === block.category);
  return [
    block.name,
    block.exportName,
    block.id,
    block.kind,
    cat?.id,
    cat?.name,
    ...(block.extras || []),
    ...(block.variants || []).map((item) => `${item.id} ${item.hint || ''}`),
    KIND_ALIASES[block.kind] || '',
    KIND_ALIASES[block.category] || '',
  ].join(' ').toLowerCase();
}

function filterPalette() {
  const query = (paletteSearch.value || '').trim().toLowerCase();
  let shown = 0;
  paletteBody.querySelectorAll('.palette-section').forEach((section) => {
    let visible = 0;
    section.querySelectorAll('.palette-group').forEach((group) => {
      const hit = !query || (group.dataset.search || '').includes(query);
      group.hidden = !hit;
      if (hit) visible += 1;
    });
    section.hidden = visible === 0;
    shown += visible;
  });
  paletteEmpty.hidden = shown > 0;
}

function renderPalette() {
  paletteBody.innerHTML = '';
  for (const cat of PALETTE_CATEGORIES) {
    const blocks = FORGE_BLOCKS.filter((item) => item.category === cat.id);
    if (!blocks.length) continue;
    const section = document.createElement('section');
    section.className = 'palette-section';
    const heading = document.createElement('div');
    heading.className = 'palette-section-title';
    heading.textContent = cat.name;
    section.appendChild(heading);
    for (const block of blocks) {
      const group = document.createElement('div');
      group.className = 'palette-group';
      group.dataset.search = blockSearchText(block);
      const title = document.createElement('div');
      title.className = 'palette-group-name';
      title.textContent = block.name;
      group.appendChild(title);
      const row = document.createElement('div');
      row.className = 'palette-variants';
      for (const variant of block.variants) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-item';
        btn.title = variant.hint ? `${block.name} · ${variant.hint}` : block.name;
        const host = document.createElement('div');
        host.className = 'fp-host';
        btn.appendChild(host);
        mountForgePreview(host, {
          exportName: block.exportName,
          name: block.name,
          variant: variant.id,
          kind: block.kind,
        });
        if (variant.id && variant.id !== 'default') {
          const label = document.createElement('span');
          label.className = 'palette-var';
          label.textContent = variant.id;
          btn.appendChild(label);
        }
        btn.addEventListener('click', () => startPlace(block, variant));
        row.appendChild(btn);
      }
      group.appendChild(row);
      section.appendChild(group);
    }
    paletteBody.appendChild(section);
  }
  filterPalette();
}

let paletteReady = false;

function setPaletteOpen(open) {
  palette.hidden = !open;
  paletteBtn.classList.toggle('active', open || !!placing || pendingPlaces.length > 0);
  if (open) {
    moreMenu.hidden = true;
    if (!paletteReady) {
      paletteReady = true;
      renderPalette();
    }
    requestAnimationFrame(() => {
      paletteSearch.focus();
      paletteSearch.select();
    });
  }
}

function renderPlaceBanner() {
  const on = !!(placing || pendingPlaces.length);
  placeBanner.hidden = !on;
  commitPlaceBtn.hidden = pendingPlaces.length === 0;
  paletteBtn.classList.toggle('active', on || !palette.hidden);
  if (pendingPlaces.length && placing) {
    placeBannerText.textContent = `${placing.name} · ${pendingPlaces.length}`;
  } else if (pendingPlaces.length) {
    placeBannerText.textContent = `${pendingPlaces.length} 个组件`;
  } else if (placing) {
    placeBannerText.textContent = placing.name;
  }
}

function positionLabel(position) {
  if (position === 'before') return '上方';
  if (position === 'left') return '左侧';
  if (position === 'right') return '右侧';
  if (position === 'inside') return '内部';
  return '下方';
}

function componentLabel(component) {
  if (!component) return 'Forge';
  if (component.variant && component.variant !== 'default') {
    return `${component.name}（${component.variant}）`;
  }
  return component.name;
}

function syncPendingPlaces(places, { keepPlacing } = {}) {
  pendingPlaces = Array.isArray(places) ? places : [];
  if (!keepPlacing) placing = null;
  renderPlaceBanner();
  if (pendingPlaces.length) {
    const last = pendingPlaces[pendingPlaces.length - 1];
    if (last?.pick?.selector) {
      lastPick = last.pick;
      includePick = true;
      renderPickChip();
    }
    setPaletteOpen(true);
  }
}

function applyPlaces(places) {
  const batch = Array.isArray(places) ? places.filter((item) => item?.component) : [];
  if (!batch.length) return;
  const key = batch.map((item) => item.placedAt).join('|');
  if (key === handledPlaceAt) return;
  handledPlaceAt = key;
  lastPlace = batch[0];
  pendingPlaces = [];
  placing = null;
  setPaletteOpen(false);
  renderPlaceBanner();
  if (batch[0].pick?.selector) {
    lastPick = batch[0].pick;
    includePick = true;
    renderPickChip();
  }
  const extra = input.value.trim();
  input.value = '';
  resizeInput();
  const lines = batch.map((item, index) => {
    const n = item.index || index + 1;
    const name = componentLabel(item.component);
    if (item.relativeToIndex && item.position === 'inside') {
      const cell = item.slot?.text
        ? `单元格「${item.slot.text}」`
        : item.slot?.col >= 0
          ? `第 ${item.slot.row + 1} 行第 ${item.slot.col + 1} 列`
          : '内部';
      return `${n}. 叠在 #${item.relativeToIndex} 的${cell}插入 ${name}`;
    }
    if (item.relativeToIndex) {
      return `${n}. 在 #${item.relativeToIndex} 的${positionLabel(item.position)}插入 ${name}`;
    }
    const anchor = item.pick?.text || item.pick?.selector || '这个位置';
    return `${n}. 在「${anchor}」${positionLabel(item.position)}插入 ${name}`;
  });
  const rows = batch.some((item) => item.relativeToIndex && (item.position === 'left' || item.position === 'right'));
  const layoutNote = rows ? '同一行的组件请用 flex 排成一行，按这个相对关系还原版式。' : '按这个相对关系还原版式。';
  const text = extra
    ? `按编号一次性插入这些组件，写成完整页面。${layoutNote}${extra}\n${lines.join('\n')}`
    : `按编号一次性插入这些组件，写成完整页面。${layoutNote}\n${lines.join('\n')}`;
  sendOrQueue(text, {
    places: batch,
    place: batch[0],
    layout: lines.join('\n'),
  });
}

function commitPlace() {
  if (!pendingPlaces.length) return;
  const places = pendingPlaces.slice();
  chrome.runtime.sendMessage({ type: 'commitPlace', places, place: places[0] }, (result) => {
    void chrome.runtime.lastError;
    applyPlaces(result?.places?.length ? result.places : places);
  });
}

function startPlace(block, variant) {
  const component = {
    id: block.id,
    name: block.name,
    category: block.category,
    kind: block.kind,
    exportName: block.exportName,
    extras: block.extras,
    variant: variant?.id || 'default',
    variantHint: variant?.hint || '',
  };
  closeMenus();
  setPaletteOpen(false);
  placing = component;
  includeAnnotate = false;
  lastAnnotate = null;
  annotatePending = false;
  renderPickChip();
  renderPlaceBanner();
  chrome.runtime.sendMessage({ type: 'startPlace', component }, (result) => {
    void chrome.runtime.lastError;
    if (result?.places?.length) {
      syncPendingPlaces(result.places);
      return;
    }
    if (result?.preview && result.place) {
      const already = pendingPlaces.some((item) => item.placedAt && item.placedAt === result.place.placedAt);
      syncPendingPlaces(already ? pendingPlaces : pendingPlaces.concat(result.place));
      return;
    }
    if (placing && placing.id === component.id) {
      placing = null;
      renderPlaceBanner();
      if (pendingPlaces.length) setPaletteOpen(true);
    }
    if (result?.error) {
      current.messages.push({ role: 'assistant', text: `无法放置：${result.error}` });
      renderMessages();
    }
  });
}

function cancelPlace() {
  placing = null;
  pendingPlaces = [];
  renderPlaceBanner();
  chrome.runtime.sendMessage({ type: 'cancelPlace' }, () => {
    void chrome.runtime.lastError;
  });
}

function setTitle(title) {
  current.title = title || '新对话';
  chatTitle.textContent = current.title;
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function visibleSessions() {
  const query = (sessionSearch.value || '').trim().toLowerCase();
  if (!query) return sessions;
  return sessions.filter((session) => (session.title || '').toLowerCase().includes(query));
}

function renderSessionList() {
  const items = visibleSessions();
  sessionList.innerHTML = '';
  sessionEmpty.hidden = items.length > 0;
  sessionEmpty.textContent = items.length
    ? ''
    : sessions.length
      ? '没有匹配的会话'
      : currentCwd
        ? `这个目录还没有会话：${folderName(currentCwd)}`
        : '没有找到本地会话';
  for (const session of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'session-row';
    btn.innerHTML = `<span class="t">${escapeHtml(session.title)}</span><span class="row-meta"><span class="when">${escapeHtml(
      formatRelativeTime(session.updatedAt)
    )}</span><span class="row-actions"><button class="row-open" type="button" title="在终端打开"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" stroke="currentColor" stroke-width="1.5"></path><path d="M17 15h-5M7 10l.234.195c1.282 1.068 1.923 1.602 1.923 2.305 0 .703-.64 1.237-1.923 2.305L7 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></button><button class="row-delete" type="button" title="删除会话"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M9.17 4a3.001 3.001 0 0 1 5.66 0M20.5 6h-17M18.833 8.5l-.46 6.9c-.177 2.654-.265 3.981-1.13 4.79-.865.81-2.196.81-4.856.81h-.774c-2.66 0-3.991 0-4.856-.81-.865-.809-.954-2.136-1.13-4.79l-.46-6.9M9.5 11l.5 5M14.5 11l-.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></button></span></span>`;
    btn.addEventListener('click', () => {
      menu.hidden = true;
      loadSession(session.id);
    });
    btn.querySelector('.row-open').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSessionInTerminal(session.id);
    });
    btn.querySelector('.row-delete').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteLocalSession(session);
    });
    sessionList.appendChild(btn);
  }
}

function renderDirectories() {
  dirNow.textContent = currentCwd || '未选择';
  dirList.innerHTML = '';
  for (const directory of directories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dir-item${directory.path === currentCwd ? ' active' : ''}`;
    btn.innerHTML = `<div><div class="n">${escapeHtml(directory.name)}</div><div class="p">${escapeHtml(
      directory.path
    )}</div></div>`;
    btn.addEventListener('click', () => {
      setCurrentCwd(directory.path);
    });
    dirList.appendChild(btn);
  }
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  if (sending) return;
  sendBtn.disabled = !input.value.trim();
  sendBtn.classList.toggle('ready', !sendBtn.disabled);
  sendBtn.setAttribute('title', '发送');
}

async function loadConfig() {
  const data = await chrome.storage.local.get(['port', 'token', 'currentCwd']);
  port = data.port || 3847;
  token = data.token || '';
  currentCwd = data.currentCwd || '';
  lastPick = null;
  includePick = false;
  includeAnnotate = false;
  lastAnnotate = null;
  annotatePending = false;
  renderPickChip();
  try {
    const boot = await fetch(apiUrl('/token')).then((r) => r.json());
    token = boot.token || token;
    port = boot.port || port;
    if (token) {
      await chrome.storage.local.set({ token, port });
      chrome.runtime.sendMessage({ type: 'setConfig', port, token }, () => {
        void chrome.runtime.lastError;
      });
    }
  } catch {}
}

async function refreshDirectories() {
  const data = await api('/directories');
  directories = data.directories || [];
  if (!currentCwd && directories[0]?.path) {
    currentCwd = directories[0].path;
    await chrome.storage.local.set({ currentCwd });
  }
  renderDirectories();
}

async function refreshSessions() {
  const query = currentCwd ? `?cwd=${encodeURIComponent(currentCwd)}` : '';
  const data = await api(`/sessions${query}`);
  sessions = data.sessions || [];
  renderSessionList();
}

async function setCurrentCwd(dir) {
  currentCwd = dir;
  await chrome.storage.local.set({ currentCwd });
  renderDirectories();
  if (current.cwd && current.cwd !== currentCwd) newChat();
  else current.cwd = currentCwd;
  try {
    await refreshSessions();
  } catch {}
  moreMenu.hidden = true;
}

function applySession(session, { stick = true } = {}) {
  if (current.id) rememberSessionAttachments(current.id, current.messages);
  const prev =
    !current.id || current.id === session.id
      ? current.messages
      : sessionAttachments.get(session.id) || [];
  current = {
    id: session.id,
    cwd: session.cwd,
    title: session.title,
    updatedAt: session.updatedAt || null,
    messages: mergeUserAttachments(session.messages || [], prev),
  };
  rememberSessionAttachments(current.id, current.messages);
  if (stick) stickToBottom = true;
  setTitle(session.title);
  renderMessages();
}

function sessionFingerprint(session) {
  const messages = session?.messages || [];
  const last = messages[messages.length - 1];
  return [
    session?.id || '',
    session?.updatedAt || '',
    messages.length,
    last?.role || '',
    last?.text || '',
  ].join('\n');
}

async function syncCurrentSession() {
  if (!current.id || sending) return;
  try {
    const session = await api(`/sessions/${current.id}`);
    if (!session || sending || current.id !== session.id) return;
    if (sessionFingerprint(current) === sessionFingerprint(session)) return;
    applySession(session, { stick: stickToBottom });
  } catch {}
}

let sessionPollTimer = null;

function startSessionPoll() {
  if (sessionPollTimer) return;
  sessionPollTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    void syncCurrentSession();
  }, 2500);
}

async function loadSession(id) {
  abandonTurn();
  const session = await api(`/sessions/${id}`);
  applySession(session, { stick: true });
}

function newChat() {
  abandonTurn();
  current = { id: null, cwd: currentCwd || null, title: '新对话', updatedAt: null, messages: [] };
  stickToBottom = true;
  setTitle('新对话');
  renderMessages();
  input.focus();
}

function getPageContext(opts = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'pageContext', screenshot: opts.screenshot === true },
      (page) => {
        void chrome.runtime.lastError;
        resolve(page || {});
      }
    );
  });
}

/** DOM-first pick context + optional element crop (never full-page). */
function getElementCrop(pick, opts = {}) {
  return new Promise((resolve) => {
    if (!pick?.selector) {
      resolve({ pick: null, screenshot: null });
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'elementCrop', pick, enrich: opts.enrich !== false, opts },
      (res) => {
        void chrome.runtime.lastError;
        resolve(res || { pick, screenshot: null });
      }
    );
  });
}

function setSending(next) {
  sending = next;
  input.placeholder = next ? '排队下一条，当前轮结束后发送' : '问问这个页面';
  if (sending) {
    sendBtn.disabled = false;
    sendBtn.classList.add('ready', 'stop');
    sendBtn.setAttribute('title', '停止');
    sendBtn.innerHTML = STOP_ICON;
    return;
  }
  sendBtn.classList.remove('stop');
  sendBtn.innerHTML = SEND_ICON;
  resizeInput();
}

function stopMessage() {
  if (activeAbort) activeAbort.abort();
}

function clearMessageQueue() {
  messageQueue = [];
  renderQueue();
}

function abandonTurn() {
  sendGeneration += 1;
  clearMessageQueue();
  clearTurnActivity();
  if (sending) stopMessage();
}

function renderQueue() {
  const root = document.getElementById('messageQueue');
  if (!root) return;
  root.hidden = messageQueue.length === 0;
  root.replaceChildren();
  if (!messageQueue.length) return;
  const head = document.createElement('div');
  head.className = 'queue-head';
  head.textContent =
    messageQueue.length === 1 ? '排队 1 条 · 当前轮结束后发送' : `排队 ${messageQueue.length} 条 · 当前轮结束后发送`;
  root.appendChild(head);
  for (const item of messageQueue) {
    const row = document.createElement('div');
    row.className = 'queue-row';
    const text = document.createElement('span');
    text.className = 'queue-text';
    text.textContent = item.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'queue-remove';
    remove.title = '取消排队';
    remove.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="m15 9-6 6m0-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/></svg>';
    remove.addEventListener('click', () => {
      messageQueue = messageQueue.filter((entry) => entry.id !== item.id);
      renderQueue();
    });
    row.append(text, remove);
    root.appendChild(row);
  }
}

function enqueueMessage(text, options = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  messageQueue.push({
    id: `q${++queueSeq}`,
    text: trimmed,
    options,
  });
  input.value = '';
  resizeInput();
  renderQueue();
}

function sendOrQueue(text, options = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  const next = { ...options, ...takeComposerAttachments(options) };
  if (sending) {
    enqueueMessage(trimmed, next);
    return;
  }
  void sendMessage(trimmed, next);
}

function drainQueue() {
  if (sending || !messageQueue.length) return;
  const next = messageQueue.shift();
  renderQueue();
  void sendMessage(next.text, next.options || {});
}

async function readSseEvents(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop();
    for (const chunk of chunks) {
      const line = chunk.split('\n').find((entry) => entry.startsWith('data: '));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)));
    }
  }
}

async function sendMessage(text, options = {}) {
  if (sending || !text.trim()) return;
  const generation = sendGeneration;
  setSending(true);
  const startedAt = Date.now();
  const abort = new AbortController();
  activeAbort = abort;
  stickToBottom = true;
  const placingNow = !!(options.place || options.places?.length);
  let pick = options.pick?.selector ? options.pick : null;
  let screenshot = options.screenshot || null;
  let screenshotKind = options.screenshotKind || null;
  let screenshotNotes = options.screenshotNotes || null;
  if (!placingNow && screenshotKind === 'annotate') {
    pick = null;
  } else if (!pick) {
    const placePick = placePickFromOptions(options);
    if (placePick?.selector) pick = placePick;
  }
  current.messages.push({ role: 'user', text, pick, screenshot, screenshotKind });
  current.messages.push({ role: 'assistant', text: '', pending: true });
  startTurnActivity();
  rememberSessionAttachments(current.id, current.messages);
  empty.hidden = true;
  renderMessages();
  input.value = '';
  resizeInput();
  try {
    // DOM-first: never full-page shot. Pick/place may attach a small element crop.
    // Screenshot annotate is an explicit user crop + marks, not a page dump.
    const page = await getPageContext({ screenshot: false });
    if (screenshotKind !== 'annotate') {
      const cropSource = pick || (placingNow ? placePickFromOptions(options) : null);
      if (cropSource?.selector) {
        const cropped = await getElementCrop(cropSource);
        if (cropped.pick) pick = cropped.pick;
        if (cropped.screenshot) screenshot = cropped.screenshot;
        if (cropped.pick || cropped.screenshot) {
          patchLatestUser({ pick, screenshot });
          renderMessages();
        }
      }
    }
    const pathname = current.id ? `/sessions/${current.id}/messages` : '/sessions';
    const res = await fetch(apiUrl(pathname), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        text,
        cwd: current.cwd || currentCwd,
        page: { url: page.url || '', title: page.title || '' },
        screenshot,
        screenshotKind,
        screenshotNotes,
        pick,
        place: options.place || null,
        places: options.places || null,
        layout: options.layout || null,
        stream: true,
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    let streamed = '';
    let result = {};
    await readSseEvents(res, (event) => {
      if (event.type === 'activity') {
        applyActivityEvent(event);
        return;
      }
      if (event.type === 'text') {
        // Prefer delta; fall back to cumulative text from older bridges
        if (event.data) streamed += event.data;
        else if (event.text != null) streamed = event.text;
        updateStreamingText(streamed);
      }
      if (event.type === 'end') result = event;
      if (event.type === 'error') throw new Error(event.message || 'grok error');
    });
    flushStreamingPaint();
    if (generation !== sendGeneration) return;
    const summary = snapshotActivitySummary();
    if (result.session) {
      stampAssistantMeta(result.session.messages, startedAt, summary);
      applySession(result.session, { stick: true });
    } else {
      current.messages = current.messages.filter((msg) => !msg.pending);
      current.messages.push({
        role: 'assistant',
        text: result.text || streamed || (result.stopped ? '已停止' : '(空回复)'),
      });
      stampAssistantMeta(current.messages, startedAt, summary);
      current.id = result.sessionId || current.id;
    }
    // Final markdown now; session list refresh must not block the reply paint
    finishStreamUi();
    void refreshSessions();
  } catch (err) {
    flushStreamingPaint();
    if (generation !== sendGeneration) return;
    if (err.name === 'AbortError') {
      const pending = current.messages.find((msg) => msg.role === 'assistant' && msg.pending);
      if (pending) {
        pending.pending = false;
        pending.text = pending.text || '已停止';
        stampAssistantMeta(current.messages, startedAt, snapshotActivitySummary());
      }
    } else {
      current.messages = current.messages.filter((msg) => !msg.pending);
      current.messages.push({ role: 'assistant', text: `发送失败：${err.message}` });
      stampAssistantMeta(current.messages, startedAt);
    }
    finishStreamUi();
  } finally {
    activeAbort = null;
    if (sending) finishStreamUi();
    if (generation === sendGeneration) drainQueue();
  }
}

function finishStreamUi() {
  streamBodyEl = null;
  streamPaintText = '';
  clearTurnActivity();
  setSending(false);
  renderMessages();
  // Drop page agent overlays/observers as soon as the turn ends (do not wait idle).
  try {
    chrome.runtime.sendMessage({ type: 'releaseAgentUi' }, () => {
      void chrome.runtime.lastError;
    });
  } catch {}
}

function closeMenus() {
  menu.hidden = true;
  moreMenu.hidden = true;
  setPaletteOpen(false);
  closePickMenu();
}

function syncMoreMenu() {
  renderDirectories();
  dirInput.value = currentCwd || '';
}

async function openSessionInTerminal(sessionId) {
  if (!sessionId) return;
  try {
    await api(`/sessions/${sessionId}/open`, { method: 'POST', body: '{}' });
  } catch (err) {
    current.messages.push({ role: 'assistant', text: `无法打开终端：${err.message}` });
    renderMessages();
  }
}

async function deleteLocalSession(session) {
  const title = session.title || '这条会话';
  if (!window.confirm(`删除「${title}」？本地文件会一起删掉，无法恢复。`)) return;
  try {
    await api(`/sessions/${session.id}`, { method: 'DELETE' });
    if (current.id === session.id) newChat();
    await refreshSessions();
  } catch {}
}

menuBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  moreMenu.hidden = true;
  setPaletteOpen(false);
  menu.hidden = !menu.hidden;
  if (menu.hidden) return;
  sessionSearch.value = '';
  sessionSearch.focus();
  try {
    await refreshSessions();
  } catch (err) {
    sessions = [];
    renderSessionList();
    sessionEmpty.hidden = false;
    sessionEmpty.textContent =
      err.message === 'not found'
        ? '本机服务还是旧版本，请重启 server 后再拉会话'
        : err.message;
  }
});

sessionSearch.addEventListener('input', renderSessionList);
sessionSearch.addEventListener('click', (event) => event.stopPropagation());

document.getElementById('newChatBtn').addEventListener('click', () => {
  closeMenus();
  newChat();
});

pickBtn.addEventListener('click', (event) => {
  if (clearPickBtn.contains(event.target)) return;
  closePickMenu();
  if (placing || pendingPlaces.length) cancelPlace();
  if (includeAnnotate && lastAnnotate?.screenshot) {
    startAnnotate();
    return;
  }
  startPick();
});

pickExpandBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  const opening = pickMenu.hidden;
  menu.hidden = true;
  moreMenu.hidden = true;
  setPaletteOpen(false);
  if (!opening) {
    closePickMenu();
    return;
  }
  pickMenu.hidden = false;
  pickExpandBtn.setAttribute('aria-expanded', 'true');
  pickGroup.classList.add('open');
});

pickModeElement.addEventListener('click', (event) => {
  event.stopPropagation();
  closePickMenu();
  if (placing || pendingPlaces.length) cancelPlace();
  startPick();
});

pickModeAnnotate.addEventListener('click', (event) => {
  event.stopPropagation();
  closePickMenu();
  if (placing || pendingPlaces.length) cancelPlace();
  startAnnotate();
});

paletteBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  const opening = palette.hidden;
  menu.hidden = true;
  moreMenu.hidden = true;
  setPaletteOpen(opening);
});

paletteSearch.addEventListener('input', filterPalette);
paletteSearch.addEventListener('click', (event) => event.stopPropagation());
paletteSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') event.preventDefault();
  if (event.key === 'Escape' && paletteSearch.value) {
    event.stopPropagation();
    paletteSearch.value = '';
    filterPalette();
  }
});

document.getElementById('cancelPlaceBtn').addEventListener('click', cancelPlace);
document.getElementById('commitPlaceBtn').addEventListener('click', commitPlace);

clearPickBtn.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  clearPageTarget();
});

async function refreshBridgeSwitch() {
  const ok = await checkBridge();
  bridgeSwitch.hidden = !ok;
  bridgeState.textContent = ok ? `已开启 · 127.0.0.1:${port}` : '已停止。终端再跑一次安装命令即可启动';
}

moreBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  menu.hidden = true;
  setPaletteOpen(false);
  const opening = moreMenu.hidden;
  moreMenu.hidden = !opening;
  if (!opening) return;
  syncMoreMenu();
  refreshBridgeSwitch();
  try {
    await refreshDirectories();
    syncMoreMenu();
  } catch {}
});

bridgeSwitch.addEventListener('click', async (event) => {
  event.stopPropagation();
  try {
    await api('/shutdown', { method: 'POST', body: '{}' });
  } catch {}
  for (let i = 0; i < 12; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (!(await checkBridge())) break;
  }
  if (await checkBridge()) {
    bridgeSwitch.hidden = false;
    bridgeState.textContent = '开机项把它又拉起来了。再跑一次安装命令后，关闭就能停住';
    return;
  }
  await refreshBridgeSwitch();
});

dirForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = dirInput.value.trim();
  if (!raw) return;
  try {
    const resolved = await api('/directories/resolve', {
      method: 'POST',
      body: JSON.stringify({ path: raw }),
    });
    await setCurrentCwd(resolved.path);
  } catch {}
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  if (sending) stopMessage();
  else sendOrQueue(input.value.trim());
});

thread.addEventListener('scroll', () => {
  if (ignoreThreadScroll) {
    ignoreThreadScroll = false;
    lastThreadScrollTop = thread.scrollTop;
    return;
  }
  const scrolledUp = lastThreadScrollTop - thread.scrollTop;
  if (scrolledUp > 24) {
    stickToBottom = false;
  } else if (isThreadNearBottom()) {
    stickToBottom = true;
  }
  lastThreadScrollTop = thread.scrollTop;
  syncJumpLatest();
});

document.getElementById('jumpLatest').addEventListener('click', () => {
  stickToBottom = true;
  thread.scrollTop = thread.scrollHeight;
  syncThreadScroll();
});


input.addEventListener('input', resizeInput);
input.addEventListener('compositionend', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendOrQueue(input.value.trim());
  }
});

document.getElementById('shotPreviewClose')?.addEventListener('click', closeShotPreview);
document.getElementById('shotPreviewImg')?.addEventListener('click', closeShotPreview);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' && event.code !== 'Escape') return;
  const shotPreview = document.getElementById('shotPreview');
  if (shotPreview && !shotPreview.hidden) {
    closeShotPreview();
    return;
  }
  if (!pickMenu.hidden) {
    closePickMenu();
    return;
  }
  if (!palette.hidden) {
    setPaletteOpen(false);
    return;
  }
  if (placing || pendingPlaces.length) cancelPlace();
  annotatePending = false;
  renderPickChip();
  chrome.runtime.sendMessage({ type: 'cancelPick' }, () => {
    void chrome.runtime.lastError;
  });
});

document.addEventListener('click', (event) => {
  if (!menu.hidden && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
    menu.hidden = true;
  }
  if (!moreMenu.hidden && !moreMenu.contains(event.target) && !moreBtn.contains(event.target)) {
    moreMenu.hidden = true;
  }
  if (!palette.hidden && !palette.contains(event.target) && !paletteBtn.contains(event.target)) {
    setPaletteOpen(false);
  }
  if (!pickMenu.hidden && !pickGroup.contains(event.target)) {
    closePickMenu();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'lastPick') {
    lastPick = msg.pick;
    includePick = true;
    includeAnnotate = false;
    lastAnnotate = null;
    annotatePending = false;
    renderPickChip();
  }
  if (msg.type === 'lastAnnotate') {
    applyAnnotate(msg.annotate);
  }
  if (msg.type === 'lastPlace') {
    lastPlace = msg.place;
  }
  if (msg.type === 'placePreview') {
    syncPendingPlaces(msg.places || (msg.place ? [msg.place] : []), { keepPlacing: true });
  }
  if (msg.type === 'placeDismiss') {
    pendingPlaces = [];
    placing = null;
    renderPlaceBanner();
  }
});

async function checkBridge() {
  try {
    const res = await fetch(apiUrl('/health'), { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

const UPDATE_CHECK_URL =
  'https://raw.githubusercontent.com/forge-ui/forge-design-extension/main/extension/manifest.json';
const UPDATE_CHECK_MS = 12 * 60 * 60 * 1000;

let pendingUpdateVersion = null;

function compareVersions(left, right) {
  const a = String(left || '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
  const b = String(right || '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const da = a[i] || 0;
    const db = b[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function localExtensionVersion() {
  return chrome.runtime.getManifest().version;
}

function showUpdateBanner(latestVersion) {
  pendingUpdateVersion = latestVersion;
  document.getElementById('updateBannerText').textContent = `有新版本 ${latestVersion}`;
  const updateNowBtn = document.getElementById('updateNowBtn');
  if (updateNowBtn) {
    updateNowBtn.disabled = false;
    updateNowBtn.textContent = '更新';
  }
  document.getElementById('updateBanner').hidden = false;
}

function hideUpdateBanner() {
  pendingUpdateVersion = null;
  document.getElementById('updateBanner').hidden = true;
}

async function fetchPublishedExtensionVersion() {
  const stored = await chrome.storage.local.get(['latestExtensionVersion', 'latestExtensionCheckedAt']);
  const checkedAt = Number(stored.latestExtensionCheckedAt) || 0;
  if (stored.latestExtensionVersion && Date.now() - checkedAt < UPDATE_CHECK_MS) {
    return stored.latestExtensionVersion;
  }
  const res = await fetch(UPDATE_CHECK_URL, { cache: 'no-store' });
  if (!res.ok) return stored.latestExtensionVersion || null;
  const data = await res.json();
  const version = typeof data.version === 'string' ? data.version : null;
  if (!version) return stored.latestExtensionVersion || null;
  await chrome.storage.local.set({
    latestExtensionVersion: version,
    latestExtensionCheckedAt: Date.now(),
  });
  return version;
}

async function refreshUpdateBanner() {
  const current = localExtensionVersion();
  const extVersionEl = document.getElementById('extVersion');
  if (extVersionEl) extVersionEl.textContent = `插件 ${current}`;

  let latest = null;
  try {
    latest = await fetchPublishedExtensionVersion();
  } catch {}

  try {
    const health = await fetch(apiUrl('/health'), { cache: 'no-store' }).then((r) => r.json());
    const expected = health?.expectedExtensionVersion;
    if (expected && (!latest || compareVersions(expected, latest) > 0)) {
      latest = expected;
    }
  } catch {}

  if (!latest || compareVersions(current, latest) >= 0) {
    hideUpdateBanner();
    return;
  }

  const { dismissedUpdateVersion } = await chrome.storage.local.get('dismissedUpdateVersion');
  if (dismissedUpdateVersion && compareVersions(dismissedUpdateVersion, latest) >= 0) {
    hideUpdateBanner();
    return;
  }

  showUpdateBanner(latest);
}

function setSetupVisible(on) {
  document.body.classList.toggle('setup-on', on);
  document.getElementById('setup').hidden = !on;
}

async function connectApp() {
  await loadConfig();
  if (!token) return;
  try {
    await refreshDirectories();
    await refreshSessions();
  } catch {}
  if (currentCwd && !current.cwd) current.cwd = currentCwd;
  resizeInput();
  startSessionPoll();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void syncCurrentSession();
});

document.getElementById('dismissUpdateBtn').addEventListener('click', async () => {
  if (pendingUpdateVersion) {
    await chrome.storage.local.set({ dismissedUpdateVersion: pendingUpdateVersion });
  }
  hideUpdateBanner();
});

document.getElementById('updateNowBtn').addEventListener('click', async () => {
  const btn = document.getElementById('updateNowBtn');
  const label = document.getElementById('updateBannerText');
  btn.disabled = true;
  btn.textContent = '更新中';
  label.textContent = pendingUpdateVersion ? `正在更新到 ${pendingUpdateVersion}` : '正在更新';
  try {
    await api('/update', { method: 'POST', body: '{}' });
    await chrome.storage.local.remove(['latestExtensionVersion', 'latestExtensionCheckedAt']);
    chrome.runtime.reload();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '重试';
    label.textContent = err.message === 'Failed to fetch'
      ? '本机桥接未启动，无法更新'
      : err.message || '更新失败';
  }
});

document.getElementById('copyInstall').addEventListener('click', async () => {
  const cmd = document.getElementById('installCmd').textContent;
  try {
    await navigator.clipboard.writeText(cmd);
    document.getElementById('setupHint').textContent = '已复制，去终端粘贴运行';
  } catch {
    document.getElementById('setupHint').textContent = '复制失败，请手动选中命令';
  }
});

(async function init() {
  chrome.runtime.sendMessage({ type: 'getPendingPlaces' }, (res) => {
    void chrome.runtime.lastError;
    if (res?.places?.length) syncPendingPlaces(res.places, { keepPlacing: true });
  });
  document.getElementById('extVersion').textContent = `插件 ${localExtensionVersion()}`;
  void refreshUpdateBanner();
  if (await checkBridge()) {
    setSetupVisible(false);
    await connectApp();
    return;
  }
  setSetupVisible(true);
  const hint = document.getElementById('setupHint');
  const timer = setInterval(async () => {
    if (!(await checkBridge())) return;
    clearInterval(timer);
    hint.textContent = '已连上本机服务';
    setSetupVisible(false);
    await connectApp();
  }, 2000);
})();
