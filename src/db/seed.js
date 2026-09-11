/**
 * Starting content for a brand-new wedding.
 *
 * The percentage splits are the industry rules-of-thumb couples usually see
 * quoted; they are pre-filled during onboarding and fully editable there.
 * They add up to 100.
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Catering & Bar', percent: 25, isPerHead: true },
  { name: 'Venue', percent: 20, isPerHead: false },
  { name: 'Photography', percent: 12, isPerHead: false },
  { name: 'Flowers & Decor', percent: 10, isPerHead: false },
  { name: 'Music & Entertainment', percent: 8, isPerHead: false },
  { name: 'Attire & Beauty', percent: 7, isPerHead: false },
  { name: 'Videography', percent: 5, isPerHead: false },
  { name: 'Rings', percent: 3, isPerHead: false },
  { name: 'Cake & Desserts', percent: 2, isPerHead: true },
  { name: 'Stationery', percent: 2, isPerHead: true },
  { name: 'Favours & Gifts', percent: 2, isPerHead: true },
  { name: 'Transport', percent: 2, isPerHead: false },
  { name: 'Rentals', percent: 1, isPerHead: true },
  { name: 'Officiant & Licence', percent: 1, isPerHead: false },
]

/**
 * Bump when tasks are ADDED to the template below. Weddings created before the
 * bump are topped up with only the newer items the next time they're opened,
 * so an existing checklist gains what's new without resurrecting anything the
 * couple deliberately deleted.
 */
export const TASK_TEMPLATE_VERSION = 2

/**
 * The 12-month checklist template.
 *
 * `[dueMonthOffset, title, introducedIn]` — offset is months relative to the
 * wedding date: -12 is a year out, 0 is the wedding month, +1 is the month
 * after. Dates are only derived at render time, so moving the wedding date
 * re-flows the whole checklist. `introducedIn` defaults to 1.
 */
export const DEFAULT_TASKS = [
  [-12, 'Set the overall budget and who is contributing'],
  [-12, 'Draft the guest list and agree a headcount'],
  [-12, 'Pick a season and shortlist venues'],
  [-11, 'Tour venues and check available dates'],
  [-11, 'Book the ceremony venue'],
  [-10, 'Book the reception venue and lock the date'],
  [-10, 'Book the photographer'],
  [-9, 'Book the caterer and schedule a tasting'],
  [-9, 'Send save-the-dates'],
  [-8, 'Choose the wedding party'],
  [-8, 'Start shopping for wedding attire'],
  [-7, 'Book the band or DJ'],
  [-7, 'Book the florist'],
  [-6, 'Order wedding attire'],
  [-6, 'Book accommodation blocks for guests'],
  [-6, 'Plan the honeymoon and check passports'],
  [-5, 'Order invitations and stationery'],
  [-5, 'Book transport for the day'],
  [-4, 'Choose and order the cake'],
  [-4, 'Book hair and make-up trials'],
  [-4, 'Book grooming appointments — barber, brows, nails, tan', 2],
  [-3, 'Send the invitations'],
  [-3, 'Buy wedding rings'],
  [-3, 'Book the officiant and confirm paperwork'],
  [-2, 'First dress or suit fitting'],
  [-2, 'Hair colour or cut — 2 to 3 weeks out, never the week of', 2],
  [-2, 'Draft the day-of timeline'],
  [-2, 'Order favours and gifts'],
  [-1, 'Chase outstanding RSVPs'],
  [-1, 'Finalise the seating chart'],
  [-1, 'Confirm final headcount with the caterer'],
  [-1, 'Final fitting'],
  [-1, 'Facial or skin treatment — leave 2 weeks, so nothing reacts', 2],
  [-1, 'Confirm arrival times with every vendor'],
  [0, 'Haircut and beard trim — about a week before', 2],
  [0, 'Nails, brows and any spray tan — 2 to 3 days before', 2],
  [0, 'Pay outstanding vendor balances'],
  [0, 'Pack for the honeymoon'],
  [0, 'Hand out gratuities and final payments'],
  [1, 'Send thank-you notes'],
  [1, 'Return or preserve attire'],
  [1, 'Order the album and share photos'],
]

/** Currencies offered in onboarding and settings. */
export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'EUR', label: 'Euro' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
]

export const THEMES = [
  { id: 'sage', label: 'Sage', swatch: ['#7C8B72', '#C58F86', '#F7F5EF'] },
  { id: 'blush', label: 'Blush', swatch: ['#B57A72', '#7C8B72', '#FAF4F2'] },
  { id: 'ivory', label: 'Ivory', swatch: ['#94805C', '#A88D89', '#FBF9F4'] },
]

/**
 * A typical wedding-day running order, for people staring at an empty screen.
 *
 * Built around a mid-afternoon ceremony because that's the most common shape;
 * every time is a starting point to be dragged around, not a rule. Added only
 * when someone asks for it.
 */
export const DEFAULT_DAY_TIMELINE = [
  ['09:00', 'Hair and make-up starts', 'Breakfast for everyone getting ready'],
  ['11:30', 'Photographer arrives', 'Details, dress, rings, invitations'],
  ['12:30', 'Get into outfits', ''],
  ['13:15', 'First look / private vows', 'Optional, but the light is good'],
  ['14:00', 'Travel to the ceremony', ''],
  ['14:30', 'Guests arrive and are seated', 'Ushers on the doors'],
  ['15:00', 'Ceremony', ''],
  ['15:45', 'Confetti and congratulations', ''],
  ['16:00', 'Drinks reception', 'Canapés, group photos, couple portraits'],
  ['17:45', 'Call guests to their seats', ''],
  ['18:00', 'Wedding breakfast', ''],
  ['19:45', 'Speeches', 'Order agreed in advance'],
  ['20:30', 'Cake cutting', ''],
  ['20:45', 'First dance', 'Band or DJ starts straight after'],
  ['21:30', 'Evening food', ''],
  ['23:30', 'Last dance', ''],
  ['23:59', 'Carriages', 'Taxis booked, someone on bag duty'],
]
