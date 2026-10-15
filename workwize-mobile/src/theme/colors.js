/**
 * WorkWize Teal / Brand Theme - Exact match to workwize-teal CSS & branding
 */
export const Colors = {
  // Brand Colors taken from the WorkWize logo
  logoBlue: '#4058A6',      // "WorkWize" text + cloud
  logoGreen: '#6CC65B',     // "Efficiency Redefined" + cloud edge

  // Primary palette
  primary: '#4058A6',        // header, main buttons, links
  primaryDark: '#2F4390',   // hover / pressed
  primaryDeep: '#1F2C5E',   // dark text on green, toast
  primarySoft: '#E8ECF8',   // light blue fills
  primarySoftBorder: '#D5DCEE',

  // Green palette
  green: '#6CC65B',          // active tab, closed, success dots
  greenDark: '#2E8A2B',     // green buttons (white text)
  greenSoft: '#E3F5DE',     // soft green badge
  greenBorder: '#A3E396',

  // Amber / Status Open
  amber: '#F59E0B',          // "Open" status
  amberDark: '#B45309',
  amberSoft: '#FEF0D3',
  amberBorder: '#FDE68A',

  // In-Progress / Sky Blue
  progress: '#0284C7',
  progressDark: '#0369A1',
  progressSoft: '#E0F2FE',
  progressBorder: '#BAE6FD',

  // Assigned / Indigo
  assigned: '#4F46E5',
  assignedDark: '#3730A3',
  assignedSoft: '#EEF0FE',
  assignedBorder: '#DDD6FE',

  // Surfaces & Backgrounds (Clean modern light theme)
  bg: '#F2F5FB',
  bgCard: '#FFFFFF',
  bgCardHover: '#FCFDFF',
  bgSubtle: '#F7F9FD',
  bgInput: '#FAFCFF',
  bgModal: '#FFFFFF',
  bgOverlay: 'rgba(15, 23, 42, 0.55)',

  // Mobile Bottom Bar (Clean floating dock)
  dockBg: '#FFFFFF',
  dockBorder: '#DCE3F2',
  dockShadow: 'rgba(31, 44, 94, 0.12)',

  // Mobile Floating Action Button (+ Job)
  fabGradStart: '#6CC65B',
  fabGradEnd: '#2E8A2B',
  fabShadow: 'rgba(108, 198, 91, 0.45)',

  // Typography & Lines
  ink: '#1B2548',
  muted: '#6B779B',
  line: '#D5DCEE',
  lineSubtle: '#E8ECF8',
  placeholder: '#9AA5C6',
  red: '#DC2626',
  redSoft: '#FEE2E2',

  // Status Badges
  statusBadges: {
    Open: { bg: '#FEF0D3', text: '#B45309', border: '#FDE68A' },
    Assigned: { bg: '#E3E8F8', text: '#2F4390', border: '#DDD6FE' },
    'In-Progress': { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
    Closed: { bg: '#E3F5DE', text: '#2E8A2B', border: '#A3E396' },
  },
};
