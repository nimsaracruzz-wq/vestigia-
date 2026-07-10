export type Review = {
  id: number;
  author: string;
  rating: number;
  date: string;
  comment: string;
  status?: "pending" | "approved" | "spam";
};

export type Product = {
  id: number;
  name: string;
  category: "New" | "Clothing" | "Accessories" | "Sale";
  price: number;
  compareAt?: number;
  badge?: string;
  colors: string[];
  image: string;
  images: string[];
  alt: string;
  sizes: string[];
  description: string;
  details: string[];
  care: string[];
  rating: number;
  reviews: Review[];
  inventory?: Record<string, number>; // Format: "color_size" -> quantity
};

export type Collection = {
  title: string;
  kicker: string;
  image: string;
  alt: string;
};

export type JournalArticle = {
  id: number;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: string[];
  image: string;
};

export const heroProducts: Product[] = [
  {
    id: 1,
    name: "Linen Draped Vest",
    category: "New",
    price: 128,
    badge: "Quick shop",
    colors: ["#e8ded1", "#242424", "#9e9a86"],
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Model wearing a neutral linen vest",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Crafted from exceptionally breathable European flax, this draped linen vest offers structured elegance with a weightless feel. Designed with clean tailored lines and a double-breasted button front, it layers effortlessly over silk camisoles or soft rib tanks for an elevated warm-weather ensemble.",
    details: [
      "Relaxed tailored fit with an open front option",
      "Double-breasted tonal button closure",
      "Welt side pockets and fully lined interior",
      "100% European Flax Linen"
    ],
    care: [
      "Dry clean recommended",
      "Or machine wash cold on delicate cycle",
      "Reshape and lay flat to dry",
      "Warm iron if needed"
    ],
    rating: 4.8,
    reviews: [
      { id: 1, author: "Evelyn W.", rating: 5, date: "June 12, 2026", comment: "Absolutely stunning drape. I purchased the natural beige color and it goes with everything." },
      { id: 2, author: "Marcus K.", rating: 4, date: "May 28, 2026", comment: "Very breathable fabric. Fits slightly oversized so consider sizing down if you prefer a slim silhouette." }
    ]
  },
  {
    id: 2,
    name: "Tapered City Trouser",
    category: "Clothing",
    price: 148,
    colors: ["#0f1115", "#d9d0c4", "#6d766a"],
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Neutral tailored outfit on a city street",
    sizes: ["24", "26", "28", "30", "32"],
    description: "The Tapered City Trouser bridges the gap between structured tailoring and all-day comfort. Featuring a high-rise waist with crisp front creases, it tapers gently through the ankle. Made from a refined, wrinkle-resistant wool-blend flannel that moves with you.",
    details: [
      "High-waisted, tapered silhouette",
      "Zip fly with concealed hook-and-bar closure",
      "Front slant pockets and rear button-through welt pockets",
      "60% Wool, 38% Polyester, 2% Elastane"
    ],
    care: [
      "Dry clean only",
      "Iron low heat with pressing cloth"
    ],
    rating: 4.9,
    reviews: [
      { id: 1, author: "Sarah L.", rating: 5, date: "June 20, 2026", comment: "Best trousers I own. They don't wrinkle even after a full day at the office." }
    ]
  },
  {
    id: 3,
    name: "Fine Hoop Set",
    category: "Accessories",
    price: 58,
    badge: "Bestseller",
    colors: ["#d7b56d", "#c7c7c7"],
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Close portrait with gold hoop jewelry",
    sizes: ["OS"],
    description: "A pair of delicate, lightweight hoop earrings designed for daily wear. Made with an elegant 18k gold vermeil or sterling silver finish, this dual-sized set can be layered together or worn separately as minimalist statements.",
    details: [
      "Includes two pairs of differing diameters (12mm and 18mm)",
      "Hypoallergenic hollow-tube design",
      "Hinge post closure",
      "18k Gold Vermeil on Sterling Silver base"
    ],
    care: [
      "Avoid contact with water, perfumes, and lotions",
      "Store in the provided microfiber pouch",
      "Polishing gently with dry jewelry cloth"
    ],
    rating: 4.7,
    reviews: [
      { id: 1, author: "Chloe M.", rating: 5, date: "May 15, 2026", comment: "Super light and shiny. They don't irritate my sensitive skin at all." }
    ]
  }
];

export const products: Product[] = [
  ...heroProducts,
  {
    id: 4,
    name: "Washed Rib Tank",
    category: "Clothing",
    price: 64,
    compareAt: 88,
    badge: "Sale",
    colors: ["#ffffff", "#b7b1a6", "#222222"],
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Model in a minimal rib tank",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "An absolute wardrobe necessity. The Washed Rib Tank is knitted from organically sourced Supima cotton and modal for exceptional softness. With a high neckline, micro-rib texture, and a soft mineral wash finish for vintage texture.",
    details: [
      "Slim fit body contouring cut",
      "Micro-rib knit stretch fabric",
      "High neck and deep armholes",
      "50% Organic Supima Cotton, 50% Lenzing Modal"
    ],
    care: [
      "Machine wash cold inside out with similar colors",
      "Tumble dry low",
      "Do not bleach"
    ],
    rating: 4.6,
    reviews: [
      { id: 1, author: "Jessie D.", rating: 4, date: "June 25, 2026", comment: "Very soft but fits tightly. I recommend sizing up if you want a more casual look." }
    ]
  },
  {
    id: 5,
    name: "Soft Utility Shirt",
    category: "New",
    price: 118,
    colors: ["#ebe5d9", "#bcc5b7", "#161616"],
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Editorial model in layered neutral clothing",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "The Soft Utility Shirt combines masculine military styling with feminine fabrication. Made of washed sand-washed Tencel silk, it features oversized chest pockets, drop shoulders, and a clean button placket.",
    details: [
      "Oversized boyfriend cut design",
      "Button front with mother-of-pearl buttons",
      "Functional dual patch chest pockets",
      "85% Tencel Lyocell, 15% Silk"
    ],
    care: [
      "Hand wash cold water",
      "Hang to dry",
      "Cool iron on reverse"
    ],
    rating: 4.8,
    reviews: [
      { id: 1, author: "Amelia V.", rating: 5, date: "June 03, 2026", comment: "The silk blend makes it feel so luxurious. Looks great tucked or untucked." }
    ]
  },
  {
    id: 6,
    name: "Arc Leather Tote",
    category: "Accessories",
    price: 176,
    badge: "Low stock",
    colors: ["#2b1e18", "#c4a47f", "#111111"],
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Structured leather tote bag",
    sizes: ["OS"],
    description: "Form meets function in the Arc Leather Tote. Sculpted with a curved crescent-shaped base from full-grain Italian pebbled leather, this structured tote carries a 13-inch laptop, water bottle, and all everyday essentials.",
    details: [
      "Curved crescent aesthetic profile",
      "Interior zip pocket and card slot divider",
      "Magnetic top bridge closure",
      "100% Genuine Italian Calf Leather, suede lining"
    ],
    care: [
      "Clean with a soft damp cloth and leather conditioner",
      "Avoid contact with oil, liquids and harsh light"
    ],
    rating: 4.9,
    reviews: [
      { id: 1, author: "Daniela R.", rating: 5, date: "June 11, 2026", comment: "Beautiful craftsmanship. The leather smells gorgeous and holds its shape perfectly." }
    ]
  },
  {
    id: 7,
    name: "Relaxed Poplin Dress",
    category: "Clothing",
    price: 156,
    colors: ["#f7f5ef", "#7f8675", "#202020"],
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Model in a relaxed dress",
    sizes: ["XS", "S", "M", "L"],
    description: "A breezy dress suited for seaside getaways and warm weekend strolls. Made from premium cotton poplin, it has a flowing tiered silhouette, an adjustable halter drawcord neckline, and deep side-seam pockets.",
    details: [
      "Tiered flowy silhouette",
      "Functional side-seam pockets",
      "Adjustable drawstring neckline",
      "100% Organic Long-Staple Cotton Poplin"
    ],
    care: [
      "Machine wash warm with similar colors",
      "Line dry in shade",
      "Medium steam iron"
    ],
    rating: 4.7,
    reviews: [
      { id: 1, author: "Hanna G.", rating: 4, date: "May 30, 2026", comment: "Extremely breezy and comfortable. Love the pockets! Slightly long for shorter heights." }
    ]
  },
  {
    id: 8,
    name: "Sculpted Sandal",
    category: "Sale",
    price: 92,
    compareAt: 132,
    colors: ["#e7d4bd", "#1f1f1f"],
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "Minimal heeled sandal",
    sizes: ["6", "7", "8", "9", "10"],
    description: "A structural sandal that complements any minimalist dress or trouser. Features an asymmetric wrap-around leather strap, a squared toe bed, and a stacked architectural wooden kitten heel.",
    details: [
      "Stacked 1.8-inch architectural wooden heel",
      "Square toe silhouette",
      "Asymmetric hand-stitched leather upper straps",
      "Leather outsole and cushioned leather footbed"
    ],
    care: [
      "Treat leather upper straps with neutral polish",
      "Avoid exposure to rain or direct heat sources"
    ],
    rating: 4.5,
    reviews: [
      { id: 1, author: "Monica P.", rating: 5, date: "June 05, 2026", comment: "Comfortable right out of the box. Walked around the city all day in them." }
    ]
  }
];

export const collections: Collection[] = [
  {
    title: "Warm weather layers",
    kicker: "New arrivals",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=85",
    alt: "Editorial fashion portrait in warm sunlight"
  },
  {
    title: "Polished travel essentials",
    kicker: "The edit",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85",
    alt: "Model wearing a black top against a bright background"
  },
  {
    title: "Accessories with intent",
    kicker: "Finishing touches",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85",
    alt: "Gold jewelry arrangement"
  }
];

export const journalArticles: JournalArticle[] = [
  {
    id: 1,
    title: "How to pack a five-piece capsule",
    date: "June 28, 2026",
    readTime: "4 min read",
    excerpt: "Editorial content blocks give merchandising context and keep shoppers moving. Learn the art of minimalist packing for your next destination.",
    content: [
      "The philosophy of a capsule wardrobe rests on a single foundation: versatility. When packing for travel, this rule is amplified. The goal is to achieve maximum utility out of minimal baggage, reducing packing stress and easing movement.",
      "To pack a perfect five-piece travel wardrobe, select pieces that interact seamlessly. We recommend one tailored pant (like the Tapered City Trouser), one light linen layer (the Linen Draped Vest), a premium knit tank, a versatile dress, and one structured tote to tie the looks together.",
      "By coordinating tones—keeping to neutral palettes of beige, charcoal, cream, and olive—each piece can be combined into a minimum of eight unique outfits. Transitioning from seaside lunches to formal dinners becomes as simple as switching from flat sandals to a sculpted stacked heel."
    ],
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: 2,
    title: "The quiet return of warm metal jewelry",
    date: "June 14, 2026",
    readTime: "3 min read",
    excerpt: "Gold has entered a new era of dominance. Explore why luxury fashion is shifting back to warm, glowing textures and solid contours.",
    content: [
      "After years of silver dominating minimalist streetwear circles, gold has quietly reclaimed its position at the apex of premium styling. The return is not flashy or loud, but characterized by soft finishes, brushed textures, and structural shapes.",
      "The modern approach to gold relies on restraint. Solid, structural pieces like our Fine Hoop Set offer a glowing warmth that complements neutral fabrics (linen, cotton poplin, silk). Rather than stacking excessive chains, the contemporary silhouette favors single, intentional focal points.",
      "When styling warm metallics, match them with off-whites and natural flax fibers. The reflection of gold against raw fabrics amplifies the organic quality of the outfit, creating an overall impression of effortless luxury."
    ],
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: 3,
    title: "Fabric notes: linen, poplin, rib knit",
    date: "May 29, 2026",
    readTime: "6 min read",
    excerpt: "Understanding the fabrics we drape ourselves in is key. An editorial review of textile weight, breathability, and structure.",
    content: [
      "Every garment tells a story through its textile composition. At Vestigia, our selection of fabrics is driven by sensory quality, durability, and comfort in warm climates.",
      "Linen remains the ultimate summer canvas. Extracted from the fibers of the flax plant, it is naturally thermoregulating and hypoallergenic. We embrace linen's natural tendency to crease, viewing it as a mark of relaxed luxury.",
      "Cotton poplin, on the other hand, provides crisp, structured lines. Woven tightly with a fine warp and thicker weft, it is incredibly lightweight yet retains structural volume. Our Relaxed Poplin Dress utilizes this to create dramatic, airy shapes that stay away from the skin, encouraging cooling airflow."
    ],
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85"
  }
];
