import {
  ActivityCard,
  AppLayout,
  ArtisticIcon,
  Avatar,
  AvatarGroup,
  BalanceCard,
  BarChart,
  BarChartStatCard,
  BarHorizontalChart,
  BarUpsideDownChart,
  Breadcrumbs,
  BubbleChart,
  Button,
  ButtonGroup,
  CalendarDayCell,
  CalendarWeekRow,
  CellActions,
  CellCode,
  CellFile,
  CellImageText,
  CellKebabMenu,
  CellLink,
  CellMuted,
  CellNumber,
  CellProgressBar,
  CellProgressValue,
  CellRating,
  CellStatusDot,
  CellText,
  CellTextSubtitle,
  ChartCard,
  ChartLegendItem,
  ChartListItem,
  ChartStatFooter,
  ChartValueRow,
  ChatBubble,
  ChatInputBar,
  CheckboxWithLabel,
  CircleIcon,
  ColorPicker,
  ColorSection,
  ColorSwatch,
  CommentItem,
  ConfirmationDialog,
  ContactItem,
  CreditCard,
  CurrencyConverter,
  DataTable,
  Datepicker,
  DebitCard,
  DescriptionItem,
  DonutChart,
  DropdownPanel,
  DashedHalfDonutChart,
  EventCard,
  EventTag,
  FileCard,
  FileTypeIcon,
  FileUpload,
  FilterGroup,
  FilterPanel,
  FilterTrigger,
  FullCalendar,
  FullWidthTable,
  HalfDonutChart,
  HighlightCard,
  HistoryGrouped,
  HistoryItem,
  IconButton,
  IconPicker,
  IconSelector,
  IconTrigger,
  ImageGrid,
  ImageStatCard,
  KebabMenu,
  Label,
  LineChartStatCard,
  ListGroup,
  ListItem,
  MapCard,
  MediaUpload,
  MenuItem,
  MeterChart,
  MultilayerDonutChart,
  NotificationBadge,
  NotificationItem,
  PageDot,
  PageHeader,
  PageTitleToolbar,
  Pagination,
  PieChart,
  ProductRow,
  ProfileCard,
  ProfileImgUpload,
  ProgressBadge,
  ProgressBar,
  ProgressCard,
  ProgressStatCard,
  ProjectCard,
  RadioWithLabel,
  RatingStars,
  ReviewItem,
  SelectOption,
  SidebarMenu,
  SmallCalendar,
  SmallDailyCalendar,
  SmoothLineChart,
  StatCard,
  TableCell,
  StatusBadge,
  Stepper,
  StyledLink,
  SurfaceCard,
  TabBar,
  TaskCard,
  TextArea,
  TextField,
  TextFieldSelectSuffix,
  Toggle,
  Toolbar,
  ToolbarActions,
  ToolbarDatepicker,
  ToolbarFavoriteButton,
  ToolbarFilterButton,
  ToolbarKebabButton,
  ToolbarPillTabs,
  ToolbarSearchInput,
  ToolbarSelectDropdown,
  ToolbarShowSelect,
  Tooltip,
  TopBar,
  TypefaceBlock,
  TypographySizeRow,
  TypographyWeightSample,
  UserCard,
  WheelChartStatCard,
} from '@forge-ui-official/core';
import {
  AddCircleLinear,
  BellBoldDuotone,
  ChartSquareBoldDuotone,
  CheckCircleLinear,
  LetterBoldDuotone,
  ShareLinear,
  StarLinear,
  WalletBoldDuotone,
  WalletLinear,
} from 'solar-icon-set';

const AV = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#D3C2F8" width="80" height="80"/><circle cx="40" cy="30" r="14" fill="#7239EA"/><ellipse cx="40" cy="72" rx="24" ry="20" fill="#7239EA"/></svg>',
)}`;
const IMG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect fill="#F1EBFD" width="160" height="200"/><rect x="24" y="40" width="112" height="140" rx="16" fill="#D3C2F8"/><circle cx="80" cy="90" r="28" fill="#7239EA"/></svg>',
)}`;
const FLAG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect fill="#7239EA" width="44" height="44" rx="8"/></svg>',
)}`;

const CHART_COLORS = ['purple', 'blue', 'green', 'red', 'orange', 'yellow', 'cyan'];
const CARD_THEMES = ['white', 'black', 'purple', 'blue', 'green', 'red', 'yellow', 'cyan'];
const SEGMENTS = [{ value: 40 }, { value: 30 }, { value: 30 }];
const TABLE_ROWS = [
  { name: 'Jane Cooper', email: 'jane@forge.dev', status: 'Active' },
  { name: 'Alex Chen', email: 'alex@forge.dev', status: 'Pending' },
];
const TABLE_COLUMNS = [
  { key: 'name', header: 'Name', render: (row) => <CellText>{row.name}</CellText> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge label={row.status} color={row.status === 'Active' ? 'green' : 'yellow'} /> },
];
const SELECT_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
];

function theme(vid, fallback = 'white') {
  return CARD_THEMES.includes(vid) ? vid : fallback;
}

function chartColor(vid) {
  return CHART_COLORS.includes(vid) ? vid : 'purple';
}

function dialogColor(vid) {
  if (vid === 'right') return 'purple';
  return ['purple', 'red', 'green', 'yellow', 'blue'].includes(vid) ? vid : 'purple';
}

export const TIGHT_KINDS = ['button', 'iconbtn', 'chip', 'toggle', 'link', 'pager', 'crumbs', 'tabs', 'cell'];
export const WIDE_KINDS = ['layout', 'table', 'chart', 'cal', 'header', 'nav'];

export function sample(exportName, variant = 'default', surface) {
  const v = variant || 'default';
  const cardWidth = surface === 'ghost' ? 'full' : 'fixed';
  const map = {
    AppLayout: (
      <AppLayout
        mode={v === 'dark' ? 'dark' : 'light'}
        profilePosition="topbar"
        accent="purple"
        logoText="Forge"
        teamName="Forge Studio"
        teamMemberCount={12}
        menuItems={[
          { label: 'Overview', href: '/', icon: <WalletBoldDuotone size={20} /> },
          { label: 'Projects', href: '/projects', icon: <ChartSquareBoldDuotone size={20} /> },
        ]}
        profile={{ avatar: AV, name: 'Maya', role: 'Admin' }}
        pageTitle="Overview"
        notifications={3}
        messages={2}
      >
        <div className="rounded-2xl bg-white p-5 outline outline-1 outline-offset-[-1px] outline-fg-grey-200">
          <p className="text-sm font-semibold leading-5 text-fg-black">Dashboard</p>
          <p className="mt-1 text-xs font-medium text-fg-grey-700">Weekly activity</p>
        </div>
      </AppLayout>
    ),
    TopBar: <TopBar value={64} color="purple" />,
    PageHeader: v === 'search'
      ? <PageHeader variant="search" searchPlaceholder="Search" notifications={3} profile={{ name: 'Maya', role: 'Admin', avatar: AV }} />
      : <PageHeader variant="title" title="Page Title" primaryAction={{ label: 'primary' }} />,
    PageTitleToolbar: (
      <PageTitleToolbar
        variant={['overview', 'collection', 'detail', 'action'].includes(v) ? v : 'overview'}
        title="Overview"
        breadcrumbItems={[{ label: 'Home' }, { label: 'Overview' }]}
        primaryAction={{ label: 'Action' }}
        secondaryAction={v === 'action' || v === 'collection' || v === 'detail' ? { label: 'Secondary' } : undefined}
      />
    ),
    Toolbar: (
      <Toolbar
        left={<ToolbarSearchInput placeholder="Search" />}
        right={(
          <ToolbarActions>
            <ToolbarSelectDropdown placeholder="Select..." />
            <ToolbarFilterButton />
          </ToolbarActions>
        )}
      />
    ),
    ToolbarSearchInput: <ToolbarSearchInput placeholder="Search" />,
    ToolbarSelectDropdown: <ToolbarSelectDropdown placeholder="Select..." />,
    ToolbarDatepicker: <ToolbarDatepicker label="Select Dates" />,
    ToolbarFilterButton: <ToolbarFilterButton />,
    ToolbarShowSelect: <ToolbarShowSelect value="10" />,
    ToolbarActions: (
      <ToolbarActions>
        <ToolbarSelectDropdown placeholder="Select..." />
        <ToolbarFilterButton />
        <ToolbarShowSelect value="10" />
      </ToolbarActions>
    ),
    ToolbarKebabButton: <ToolbarKebabButton />,
    ToolbarFavoriteButton: <ToolbarFavoriteButton />,
    ToolbarPillTabs: (
      <ToolbarPillTabs
        color="purple"
        tabs={[{ label: 'All', active: true }, { label: 'Open' }, { label: 'Done' }]}
      />
    ),
    Breadcrumbs: <Breadcrumbs items={[{ label: 'Home' }, { label: 'Page' }]} />,
    SidebarMenu: (
      <SidebarMenu
        logoText="Forge"
        mainMenuItems={[
          { label: 'Overview', href: '/', active: true, icon: <WalletBoldDuotone size={20} /> },
          { label: 'Projects', href: '/p', icon: <ChartSquareBoldDuotone size={20} /> },
        ]}
        profile={{ avatar: AV, name: 'Maya', role: 'Admin' }}
      />
    ),
    TabBar: (
      <TabBar
        surface={v === 'page' ? 'page' : 'inline'}
        tabs={[{ label: 'All', active: true }, { label: 'Open' }, { label: 'Done' }]}
      />
    ),
    Pagination: <Pagination totalPages={8} currentPage={1} />,
    PageDot: <PageDot active>1</PageDot>,
    Stepper: <Stepper total={4} current={2} />,
    DataTable: <DataTable title="Active Users" columns={TABLE_COLUMNS} rows={TABLE_ROWS} getRowKey={(row) => row.email} />,
    FullWidthTable: <FullWidthTable title="Projects" columns={TABLE_COLUMNS} rows={TABLE_ROWS} getRowKey={(row) => row.email} />,
    TableCell: (
      <TableCell variant={v === 'header' ? 'header' : 'body'}>
        {v === 'header' ? 'Name' : <CellText>Jane Cooper</CellText>}
      </TableCell>
    ),
    CellText: <CellText>Jane Cooper</CellText>,
    CellTextSubtitle: <CellTextSubtitle title="Jane Cooper" subtitle="Product" />,
    CellMuted: <CellMuted>jane@forge.dev</CellMuted>,
    CellImageText: <CellImageText src={AV} title="Jane Cooper" subtitle="Admin" rounded="full" />,
    StatusBadge: <StatusBadge label="Active" color={['green', 'yellow', 'red', 'grey'].includes(v) ? v : 'green'} />,
    ProgressBadge: <ProgressBadge label="+12%" color={['green', 'red', 'grey'].includes(v) ? v : 'green'} />,
    CellProgressValue: <CellProgressValue value="$24,500" badge="+10%" />,
    CellKebabMenu: <CellKebabMenu />,
    CellStatusDot: <CellStatusDot label="Online" color="green" />,
    CellNumber: <CellNumber value="1,248" trend="up" badge="+4%" />,
    CellProgressBar: <CellProgressBar value="$400" percent={64} />,
    CellCode: <CellCode code="FORGE-204" />,
    CellRating: <CellRating score="4.8" />,
    CellFile: <CellFile name="brief.pdf" size="1.2 MB" />,
    CellActions: <CellActions actions={['eye', 'pen', 'trash']} />,
    CellLink: <CellLink label="Open" />,
    ListGroup: (
      <ListGroup
        title="Inbox"
        items={
          <>
            <ListItem lead={{ kind: 'avatar', src: AV }} title="Jane Cooper" subtitle="Online" />
            <ListItem lead={{ kind: 'avatar', src: AV }} title="Alex Chen" subtitle="Away" />
          </>
        }
      />
    ),
    ListItem: <ListItem lead={{ kind: 'icon', icon: <WalletBoldDuotone size={20} />, color: 'purple' }} title="Revenue" subtitle="This month" value="$24,500" trend="10%" />,
    DescriptionItem: <DescriptionItem lead={{ kind: 'icon', icon: <LetterBoldDuotone size={20} />, color: 'purple' }} label="Email" content="a@forge.dev" />,
    FilterGroup: (
      <FilterGroup
        title="Status"
        defaultOpen
        content={{ type: 'checkbox', options: [{ value: 'a', label: 'Active', checked: true }, { value: 'b', label: 'Archived' }] }}
      />
    ),
    FilterTrigger: <FilterTrigger label="筛选" count={2} />,
    FilterPanel: (
      <FilterPanel title="筛选">
        <FilterGroup
          title="Status"
          defaultOpen
          content={{ type: 'checkbox', options: [{ value: 'a', label: 'Active', checked: true }, { value: 'b', label: 'Archived' }] }}
        />
      </FilterPanel>
    ),
    ButtonGroup: (
      <ButtonGroup
        shape={v === 'pill' ? 'pill' : 'rounded'}
        items={[{ label: 'All' }, { label: 'Open' }, { label: 'Done' }]}
      />
    ),
    StatCard: (
      <StatCard
        title="Total Revenue"
        value="$14,000"
        trend="10%"
        subtitle="+$150 today"
        theme={theme(v)}
        size={v === 'lg' || v === 'wide' ? v : 'sm'}
        width={cardWidth}
        icon={<ChartSquareBoldDuotone size={20} />}
      />
    ),
    ProgressStatCard: <ProgressStatCard title="Active Users" value="1,250" trend="12%" subtitle="+150 today" progressValue={65} progressColor="purple" width={cardWidth} />,
    LineChartStatCard: <LineChartStatCard title="Customers" value="14,000" trend="10%" subtitle="this week" chartColor={chartColor(v)} width={cardWidth} />,
    BarChartStatCard: <BarChartStatCard title="Revenue" value="8,240" trend="4%" barColor={chartColor(v)} width={cardWidth} />,
    WheelChartStatCard: <WheelChartStatCard title="Progress" value="72%" trend="2%" wheelPercent={72} wheelColor={chartColor(v)} width={cardWidth} />,
    ProgressBar: <ProgressBar value={64} color="purple" showPercentage />,
    ProgressCard: (
      <ProgressCard
        title="Tasks"
        value="72%"
        subtitle="Complete"
        progress={72}
        progressColor="var(--fg-violet)"
        items={[{ label: 'Done', value: '18', color: '#7239EA' }, { label: 'Open', value: '7', color: '#43CED7' }]}
        width={cardWidth}
      />
    ),
    ImageStatCard: <ImageStatCard title="Team of the month" subtitle="2 Jul - Today" value="128" trend="12%" backgroundImage={IMG} width={cardWidth} />,
    ChartCard: (
      <ChartCard title="Revenue" subtitle="Monthly" minHeight="min-h-40">
        <DonutChart segments={SEGMENTS} centerValue="$8.4k" size="sm" />
      </ChartCard>
    ),
    ChartListItem: (
      <ChartListItem
        icon={WalletLinear}
        title="Revenue"
        subtitle="This month"
        value="$12,500"
        trend="+12.5%"
        trendDirection="up"
      />
    ),
    ChartLegendItem: <ChartLegendItem label="Organic" value="$4,200" accent="purple" />,
    ChartValueRow: <ChartValueRow value="$24,500" trend="+10%" trendDirection="up" label="Total" color="bg-fg-violet" />,
    ChartStatFooter: (
      <ChartStatFooter
        items={[
          { label: 'Sales', value: '$8.2k', trend: '+4%', trendDirection: 'up' },
          { label: 'Orders', value: '318', trend: '+2%', trendDirection: 'up' },
        ]}
      />
    ),
    MeterChart: <MeterChart segments={[{ value: 50 }, { value: 30 }, { value: 20 }]} trend="10%" subtitle="+$181 today" />,
    DonutChart: <DonutChart segments={SEGMENTS} centerValue="$8.4k" size="sm" />,
    HalfDonutChart: <HalfDonutChart segments={[{ value: 75 }]} centerValue="75%" trend="10%" />,
    DashedHalfDonutChart: <DashedHalfDonutChart segments={[{ value: 60 }]} centerValue="60%" />,
    PieChart: <PieChart segments={SEGMENTS} size="sm" />,
    MultilayerDonutChart: <MultilayerDonutChart layers={[{ value: 80 }, { value: 60 }, { value: 40 }]} centerValue="80%" />,
    BubbleChart: <BubbleChart bubbles={[{ value: 40 }, { value: 25 }, { value: 15 }]} height={160} />,
    BarChart: <BarChart data={[{ value: 20 }, { value: 45 }, { value: 30 }, { value: 60 }]} activeIndex={3} />,
    BarHorizontalChart: <BarHorizontalChart data={[{ label: 'A', value: 80 }, { label: 'B', value: 50 }, { label: 'C', value: 32 }]} />,
    BarUpsideDownChart: <BarUpsideDownChart data={[{ upperValue: 30, lowerValue: 20 }, { upperValue: 50, lowerValue: 35 }, { upperValue: 20, lowerValue: 10 }]} />,
    SmoothLineChart: <SmoothLineChart series={[{ data: [10, 20, 15, 25, 18, 30, 22] }]} />,
    SurfaceCard: (
      <SurfaceCard
        title="Approval context"
        subtitle="Reviewer signal and next action."
        action={<IconButton aria-label="Share" size="sm" variant="tertiary"><ShareLinear size={16} color="currentColor" /></IconButton>}
        padding={['none', 'sm', 'md', 'lg'].includes(v) ? v : 'md'}
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-medium text-fg-grey-700">Risk</p>
            <p className="mt-1 text-xl font-semibold text-fg-black">High</p>
          </div>
          <div>
            <p className="text-xs font-medium text-fg-grey-700">Owner</p>
            <p className="mt-1 text-xl font-semibold text-fg-black">Elena</p>
          </div>
          <div>
            <p className="text-xs font-medium text-fg-grey-700">Due</p>
            <p className="mt-1 text-xl font-semibold text-fg-black">Today</p>
          </div>
        </div>
      </SurfaceCard>
    ),
    ProjectCard: <ProjectCard title="Aurora" description="Design system refresh" labelText="Active" labelColor="purple" progress={72} date="Apr 12" avatars={[AV, AV]} width={cardWidth} />,
    TaskCard: <TaskCard title="Design review" description="Homepage hero" labelText="Today" progress={40} date="Apr 12" avatars={[AV]} width={cardWidth} />,
    UserCard: <UserCard avatar={AV} name="Alex Chen" subtitle="Product" stats={[{ label: 'Tasks', value: '12' }, { label: 'Done', value: '8' }]} width={cardWidth} />,
    BalanceCard: <BalanceCard balance="$8,240.00" trend="4.2%" subtitle="this week" cardNumber="9090" width={cardWidth} />,
    DebitCard: <DebitCard balance="$1,200.00" cardNumber="9090" expiry="07/25" width={cardWidth} />,
    CreditCard: <CreditCard cardNumber="4242" expiry="12/27" width={cardWidth} />,
    HighlightCard: <HighlightCard title="Featured" image={IMG} products={[{ image: IMG, name: 'Sneaker', subtitle: 'Limited', value: '$89' }]} width={cardWidth} />,
    ActivityCard: (
      <ActivityCard
        icon={<ChartSquareBoldDuotone size={20} color="var(--fg-violet)" />}
        headerText="Activity"
        datetime="2h ago"
        avatar={AV}
        title="Maya posted a comment"
        description="Looks good to ship after the copy pass."
        metadata={[{ label: 'Project', value: 'Aurora' }, { label: 'Status', value: 'Open' }]}
      />
    ),
    ProfileCard: <ProfileCard avatar={AV} name="Maya" subtitle="Admin" />,
    MapCard: (
      <MapCard
        variant={['sm', 'md', 'lg'].includes(v) ? v : 'sm'}
        regions={[{ name: 'North America', flag: FLAG, salesLabel: '340 Sales', value: '$17,678' }]}
        width={cardWidth}
      />
    ),
    ProductRow: <ProductRow image={IMG} title="Sneaker" subtitle="$89" />,
    TextField: <TextField label="Email" placeholder="name@forge.dev" shape={v === 'pill' ? 'pill' : 'rounded'} />,
    TextFieldSelectSuffix: (
      <TextField
        label="Amount"
        placeholder="0.00"
        shape="rounded"
        suffix={<TextFieldSelectSuffix value="USD" options={['USD', 'EUR', 'CNY']} />}
      />
    ),
    TextArea: <TextArea label="Notes" placeholder="Write something" shape={v === 'pill' ? 'pill' : 'rounded'} />,
    SelectOption: <SelectOption label="Status" type={['general', 'single', 'multiple', 'image'].includes(v) ? v : 'general'} options={SELECT_OPTIONS} />,
    Datepicker: <Datepicker label="Date" mode={v === 'range' ? 'range' : 'single'} />,
    Toggle: <Toggle checked />,
    RadioWithLabel: <RadioWithLabel checked label="Option A" />,
    CheckboxWithLabel: <CheckboxWithLabel checked label="Remember" />,
    FileUpload: <FileUpload files={[{ id: '1', name: 'brief.pdf', size: '1.2 MB', state: 'success' }]} />,
    FileCard: <FileCard file={{ id: '1', name: 'brief.pdf', size: '1.2 MB', state: 'success' }} />,
    MediaUpload: <MediaUpload items={[{ id: '1', src: IMG }]} />,
    ProfileImgUpload: <ProfileImgUpload src={AV} label="Upload photo" />,
    IconPicker: <IconPicker icons={[<StarLinear key="a" size={20} />, <AddCircleLinear key="b" size={20} />, <CheckCircleLinear key="c" size={20} />]} selectedIndex={0} />,
    IconSelector: (
      <IconSelector
        label="Icon"
        icons={[<StarLinear key="a" size={20} />, <AddCircleLinear key="b" size={20} />, <WalletLinear key="c" size={20} />]}
        labels={['Star', 'Add', 'Wallet']}
        selectedIndex={0}
      />
    ),
    ColorPicker: <ColorPicker selectedIndex={0} />,
    ContactItem: <ContactItem avatar={AV} name="Jordan" message="See you tomorrow!" time="10:30" unreadCount={2} online />,
    ChatBubble: (
      <div className="flex flex-col gap-2">
        <ChatBubble type="received" content="Can you review this?" time="10:21" avatar={AV} senderName="Maya" />
        <ChatBubble type="sent" content="On it." time="10:22" />
      </div>
    ),
    ChatInputBar: <ChatInputBar placeholder="Message" />,
    CommentItem: <CommentItem avatar={AV} name="Maya" date="2h ago" content="Nice work on the layout." />,
    ReviewItem: v === 'regular'
      ? <ReviewItem avatar={AV} name="Jane Cooper" subtitle="Verified buyer" date="2 days ago" rating={5} content="Great product, exactly what I needed." />
      : <ReviewItem variant="card" width={cardWidth} avatar={AV} name="Jane Cooper" date="2 days ago" rating={5} content="Great product, exactly what I needed." />,
    NotificationItem: <NotificationItem tag="System" time="2h ago" title="Your order has been shipped" body="Tracking number: 1Z999AA10123456784" unread onMarkRead={() => {}} />,
    HistoryItem: (
      <HistoryItem
        variant={['regular', 'badge', 'profile'].includes(v) ? v : 'regular'}
        title="Order placed"
        description="Your order has been submitted"
        datetime="10:30 AM"
        icon={v === 'badge' ? <CheckCircleLinear size={20} /> : undefined}
        avatar={v === 'profile' ? AV : undefined}
      />
    ),
    HistoryGrouped: (
      <HistoryGrouped
        title="Today"
        items={[
          { title: 'Login', datetime: '10:00' },
          { title: 'Updated task', datetime: '10:30' },
        ]}
      />
    ),
    Avatar: <Avatar src={AV} size="lg" />,
    AvatarGroup: (
      <AvatarGroup overflowCount={3}>
        <Avatar src={AV} size="sm" />
        <Avatar src={AV} size="sm" />
        <Avatar src={AV} size="sm" />
      </AvatarGroup>
    ),
    Label: <Label variant={v === 'solid' ? 'solid' : 'outline'}>Label</Label>,
    NotificationBadge: <NotificationBadge>3</NotificationBadge>,
    CircleIcon: (
      <CircleIcon color="purple" variant={['solid', 'light', 'neutral'].includes(v) ? v : 'solid'}>
        <BellBoldDuotone size={18} />
      </CircleIcon>
    ),
    ArtisticIcon: (
      <ArtisticIcon color="purple" variant={v === 'orbs' ? 'orbs' : 'gradient'}>
        <BellBoldDuotone size={24} />
      </ArtisticIcon>
    ),
    FileTypeIcon: <FileTypeIcon fileName="brief.pdf" />,
    ColorSwatch: <ColorSwatch label="Violet" hex="#7239EA" tone="dark" />,
    ColorSection: (
      <ColorSection
        title="Violet"
        darkLabelUntil={400}
        scale={[
          { shade: 100, hex: '#F1EBFD' },
          { shade: 300, hex: '#D3C2F8' },
          { shade: 500, hex: '#7239EA' },
          { shade: 700, hex: '#4B1FA8' },
        ]}
      />
    ),
    TypefaceBlock: <TypefaceBlock name="Manrope" />,
    TypographyWeightSample: <TypographyWeightSample text="Aa" weight={600} sizeClass="text-2xl" />,
    TypographySizeRow: <TypographySizeRow label="Body" text="Design systems" sizeClass="text-base" />,
    SmallCalendar: <SmallCalendar events={[{ day: 12, title: 'Kickoff', timeRange: '10:00-11:00' }]} width={cardWidth} />,
    SmallDailyCalendar: <SmallDailyCalendar events={[{ title: 'Kickoff', timeRange: '10:00-11:00', startHour: 10, duration: 1 }]} />,
    FullCalendar: <FullCalendar events={[{ day: 12, label: 'Kickoff', color: 'purple' }]} />,
    EventCard: <EventCard title="Kickoff" timeRange="10:00-11:00" avatars={[AV]} width={cardWidth} />,
    EventTag: <EventTag label="Meeting" />,
    CalendarDayCell: <CalendarDayCell day={12} isToday events={[{ label: 'Sync', color: 'purple' }]} />,
    CalendarWeekRow: <CalendarWeekRow time="09:00" events={[{ label: 'Design', color: 'purple' }]} />,
    Button: <Button variant={['primary', 'secondary', 'tertiary'].includes(v) ? v : 'primary'}>Text</Button>,
    IconButton: (
      <IconButton variant={['primary', 'secondary', 'tertiary', 'ghost'].includes(v) ? v : 'primary'} aria-label="Add">
        <AddCircleLinear size={16} />
      </IconButton>
    ),
    StyledLink: <StyledLink href="#">Open</StyledLink>,
    ConfirmationDialog: (
      <ConfirmationDialog
        title="Delete this item?"
        description="This action cannot be undone."
        color={dialogColor(v)}
        layout={v === 'right' ? 'right' : 'spread'}
      />
    ),
    Tooltip: (
      <Tooltip content="Tooltip" open>
        <Button size="sm">Hover</Button>
      </Tooltip>
    ),
    DropdownPanel: (
      <DropdownPanel>
        <MenuItem label="Edit" />
        <MenuItem label="Duplicate" />
        <MenuItem label="Delete" intent="danger" />
      </DropdownPanel>
    ),
    KebabMenu: <KebabMenu items={[{ label: 'Edit' }, { label: 'Delete', danger: true }]} />,
    MenuItem: <MenuItem label="Settings" />,
    IconTrigger: <IconTrigger icon={<StarLinear size={16} />} aria-label="More" />,
    CurrencyConverter: <CurrencyConverter fromValue="100" fromCurrency="USD" toValue="720" toCurrency="CNY" width={cardWidth} />,
    RatingStars: <RatingStars value={4} />,
    ImageGrid: <ImageGrid images={[IMG, IMG, IMG]} overflowCount={2} />,
  };

  return map[exportName] || <Button>{exportName}</Button>;
}
