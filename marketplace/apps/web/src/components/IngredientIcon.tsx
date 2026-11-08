import { Piece } from "./PizzaPreview";

/** Small round illustration for an ingredient tile (until photo icons are added). */
const EXTRA: Record<string, React.ReactNode> = {
  "klassischer-teig": <circle r="11" fill="#e2b06e" stroke="#c88442" strokeWidth="3" />,
  vollkornteig: <circle r="11" fill="#b98552" stroke="#7d5230" strokeWidth="3" />,
  tomatensosse: <><circle r="11" fill="#e2b06e" /><circle r="8.5" fill="#b8321b" /></>,
  "bbq-sosse": <><circle r="11" fill="#e2b06e" /><circle r="8.5" fill="#5e2410" /></>,
  "creme-fraiche": <><circle r="11" fill="#e2b06e" /><circle r="8.5" fill="#f4ecd9" /></>,
  "brioche-brotchen": <><path d="M-12,2 Q-12,-11 0,-11 Q12,-11 12,2 Z" fill="#d98f3f" /><rect x="-12" y="4" width="24" height="6" rx="3" fill="#e7b170" /><circle cx="-4" cy="-6" r="1" fill="#fff6dc" /><circle cx="3" cy="-8" r="1" fill="#fff6dc" /><circle cx="5" cy="-3" r="1" fill="#fff6dc" /></>,
  "vollkorn-brotchen": <><path d="M-12,2 Q-12,-11 0,-11 Q12,-11 12,2 Z" fill="#9b6a3c" /><rect x="-12" y="4" width="24" height="6" rx="3" fill="#b98552" /></>,
  "rindfleisch-patty": <rect x="-12" y="-5" width="24" height="10" rx="5" fill="#5a3320" />,
  "crispy-chicken": <rect x="-12" y="-5" width="24" height="10" rx="5" fill="#d2913c" />,
  "veggie-patty": <rect x="-12" y="-5" width="24" height="10" rx="5" fill="#7a6a3a" />,
  "cheddar-scheibe": <><rect x="-12" y="0" width="24" height="7" rx="3.5" fill="#5a3320" /><path d="M-13,-3 L13,-3 L11,3 L6,1 L2,5 L-3,1 L-8,4 L-12,1 Z" fill="#f2a531" /></>,
  bacon: <path d="M-12,-3 Q-6,-8 0,-3 Q6,2 12,-3 L12,3 Q6,8 0,3 Q-6,-2 -12,3 Z" fill="#a8321f" stroke="#f0c4a6" strokeWidth="1.5" />,
  eisbergsalat: <path d="M-12,3 Q-10,-6 -4,-3 Q-2,-10 3,-5 Q8,-9 9,-2 Q14,0 11,5 Z" fill="#79b443" />,
  tomatenscheiben: <><circle r="10" fill="#d1351f" /><circle r="7" fill="#ee6b4d" /></>,
  "rote-zwiebeln": <><circle r="10" fill="none" stroke="#9b4f8f" strokeWidth="2.5" /><circle r="6" fill="none" stroke="#e9d3e6" strokeWidth="2" /></>,
  gewurzgurken: <><circle cx="-4" r="7" fill="#7c9a3a" /><circle cx="5" cy="2" r="6" fill="#93b04a" /></>,
  spiegelei: <><path d="M-11,0 Q-11,-10 0,-9 Q12,-10 11,1 Q11,10 0,9 Q-12,10 -11,0 Z" fill="#fbfaf4" /><circle cx="1" r="4.5" fill="#f5a213" /></>,
  ketchup: <path d="M-10,4 Q-6,-6 0,-2 Q6,-8 10,4 Z" fill="#b3200f" />,
  mayonnaise: <path d="M-10,4 Q-6,-6 0,-2 Q6,-8 10,4 Z" fill="#f7efd2" stroke="#e5d9b2" />,
  "burger-sosse": <path d="M-10,4 Q-6,-6 0,-2 Q6,-8 10,4 Z" fill="#e8a868" />,
};

export function IngredientIcon({ k }: { k: string }) {
  return (
    <svg viewBox="-16 -16 32 32" aria-hidden="true" className="ing-icon">
      {EXTRA[k] ?? <g transform="scale(1.1)"><Piece k={k} x={0} y={0} rot={0} s={1} /></g>}
    </svg>
  );
}
