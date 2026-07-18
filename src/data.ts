export type Review = {
  id: number;
  author: string;
  rating: number;
  date: string;
  comment: string;
  status?: "pending" | "approved" | "spam";
};

export type SizeChartRow = {
  size: string;
  chest?: string;
  waist?: string;
  hips?: string;
  length?: string;
  inseam?: string;
  [key: string]: string | undefined;
};

export type SizeChart = {
  unit: "in" | "cm";
  columns: string[]; // e.g. ["Size", "Chest", "Waist", "Hips"]
  rows: SizeChartRow[];
  notes?: string;
};

export type Product = {
  id: number;
  name: string;
  category: "New" | "Clothing" | "Accessories" | "Sale";
  productType?: string;
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
  sizeChart?: SizeChart;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
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
    name: "VESTIGIA SIGNATURE TEE",
    category: "Clothing",
    productType: "Premium Heavyweight Oversized T-Shirt",
    price: 78,
    badge: "First Release",
    colors: ["#f3eedf"], // Cream/Off-white
    image: "/images/products/signature_front.png",
    images: [
      "/images/products/signature_front.png",
      "/images/products/signature_back.png",
      "/images/products/signature_detail.png",
      "/images/products/signature_model.png"
    ],
    alt: "VESTIGIA Signature Tee - Premium heavyweight cream cotton oversized T-shirt",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "The VESTIGIA Signature Tee establishes the foundation of our first release. Designed with a structured oversized silhouette, considered proportions, and understated brand detailing, it is created as an everyday piece that becomes part of the wearer's own story.",
    details: [
      "Premium heavyweight cotton construction (280 GSM)",
      "Structured oversized silhouette",
      "Contemporary shoulders and ribbed collar",
      "Minimal charcoal VESTIGIA brand print at center chest",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Machine wash cold inside out with similar colors",
      "Hang to dry naturally in shade",
      "Warm iron on reverse side if needed",
      "Do not dry clean or bleach"
    ],
    rating: 4.9,
    reviews: [
      { id: 1, author: "Lorenzo M.", rating: 5, date: "June 28, 2026", comment: "The weight of the fabric is incredible. It sits perfectly structured and doesn't lose shape after washing." },
      { id: 2, author: "Aanya P.", rating: 5, date: "July 02, 2026", comment: "Beautifully minimal. The off-white shade is warm and looks very premium." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Chest", "Length", "Shoulders"],
      rows: [
        { size: "XS", chest: "42", length: "27.5", shoulders: "20.5" },
        { size: "S",  chest: "44", length: "28.5", shoulders: "21.5" },
        { size: "M",  chest: "46", length: "29.5", shoulders: "22.5" },
        { size: "L",  chest: "48", length: "30.5", shoulders: "23.5" },
        { size: "XL", chest: "50", length: "31.5", shoulders: "24.5" }
      ],
      notes: "This silhouette is designed to be oversized. We recommend ordering your normal size."
    }
  },
  {
    id: 2,
    name: "VESTIGIA ORIGIN TEE",
    category: "Clothing",
    productType: "Premium Graphic T-Shirt",
    price: 85,
    badge: "Exclusive",
    colors: ["#1c1a1a"], // Charcoal black
    image: "/images/products/origin_front.png",
    images: [
      "/images/products/origin_front.png",
      "/images/products/origin_back.png",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "VESTIGIA Origin Tee - Premium washed charcoal graphic T-shirt",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "The VESTIGIA Origin Tee reflects the beginning of the brand and the connection between places, cultures, and identity. Contemporary proportions meet restrained graphic expression to create a distinctive piece from the first VESTIGIA release.",
    details: [
      "Premium midweight combed cotton construction (220 GSM)",
      "Contemporary relaxed fit",
      "Restrained line-art coordinates graphic printed on back",
      "Small VESTIGIA front chest branding",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Machine wash cold inside out with similar colors",
      "Tumble dry low or line dry in shade",
      "Cool iron on reverse; do not iron directly on print",
      "Do not bleach"
    ],
    rating: 4.8,
    reviews: [
      { id: 1, author: "Matteo S.", rating: 5, date: "June 30, 2026", comment: "The coordinate map graphic on the back is beautiful and understated. Fits perfectly relaxed." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Chest", "Length", "Shoulders"],
      rows: [
        { size: "XS", chest: "40", length: "27", shoulders: "19.5" },
        { size: "S",  chest: "42", length: "28", shoulders: "20.5" },
        { size: "M",  chest: "44", length: "29", shoulders: "21.5" },
        { size: "L",  chest: "46", length: "30", shoulders: "22.5" },
        { size: "XL", chest: "48", length: "31", shoulders: "23.5" }
      ],
      notes: "This silhouette is designed for a contemporary relaxed fit."
    }
  },
  {
    id: 3,
    name: "VESTIGIA ESSENTIAL TEE",
    category: "Clothing",
    productType: "Minimal Everyday T-Shirt",
    price: 68,
    badge: "Core Collection",
    colors: ["#8b8882"], // Stone grey
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "VESTIGIA Essential Tee - Minimal stone grey everyday T-shirt",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "The VESTIGIA Essential Tee focuses on simplicity, proportion, and everyday versatility. Clean lines, a relaxed silhouette, and subtle VESTIGIA detailing create a piece designed to remain relevant beyond a single season.",
    details: [
      "Premium lightweight soft-combed cotton (180 GSM)",
      "Classic relaxed silhouette",
      "Completely minimal design with raw detailing",
      "Subtle tone-on-tone print at the back neck collar",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Machine wash warm with similar colors",
      "Line dry in shade",
      "Medium steam iron"
    ],
    rating: 4.7,
    reviews: [
      { id: 1, author: "Isabella R.", rating: 5, date: "June 25, 2026", comment: "The ultimate layering tee. Extremely soft, breathable fabric, and a clean neckline." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Chest", "Length", "Shoulders"],
      rows: [
        { size: "XS", chest: "38", length: "26.5", shoulders: "18.5" },
        { size: "S",  chest: "40", length: "27.5", shoulders: "19.5" },
        { size: "M",  chest: "42", length: "28.5", shoulders: "20.5" },
        { size: "L",  chest: "44", length: "29.5", shoulders: "21.5" },
        { size: "XL", chest: "46", length: "30.5", shoulders: "22.5" }
      ],
      notes: "This silhouette is designed to be standard and relaxed."
    }
  },
  {
    id: 4,
    name: "VESTIGIA CLASSIC TROUSERS",
    category: "Clothing",
    productType: "Premium Cotton-Linen Trousers",
    price: 120,
    badge: "New Arrival",
    colors: ["#1c1a1a", "#8b8882"],
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "VESTIGIA Classic Trousers - Premium tailored cotton-linen trousers in charcoal black and stone grey",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Tailored trousers designed for contemporary elegance and comfort. Featuring a clean front crease, subtle side slit pockets, and crafted from a premium cotton-linen blend fabric that breathes naturally.",
    details: [
      "Premium cotton-linen blend (220 GSM)",
      "Tailored slim-straight fit",
      "Clean flat-front waistband with belt loops",
      "Concealed hook and zip closure",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Dry clean recommended",
      "Machine wash cold delicate cycle if necessary",
      "Iron low heat on reverse side",
      "Do not tumble dry"
    ],
    rating: 4.6,
    reviews: [
      { id: 1, author: "Sofia G.", rating: 5, date: "July 08, 2026", comment: "The blend of cotton and linen is excellent. Keeps structured but feels incredibly light." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Waist", "Inseam", "Hips"],
      rows: [
        { size: "XS", waist: "28", inseam: "30", hips: "36" },
        { size: "S",  waist: "30", inseam: "30.5", hips: "38" },
        { size: "M",  waist: "32", inseam: "31", hips: "40" },
        { size: "L",  waist: "34", inseam: "31.5", hips: "42" },
        { size: "XL", waist: "36", inseam: "32", hips: "44" }
      ],
      notes: "Runs true to size. If between sizes, we recommend ordering one size up."
    }
  },
  {
    id: 5,
    name: "VESTIGIA OVERSIZED HOODIE",
    category: "Clothing",
    productType: "Heavyweight Double-Faced Hoodie",
    price: 110,
    badge: "Core Collection",
    colors: ["#8b8882", "#f3eedf"],
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "VESTIGIA Oversized Hoodie - Premium double-faced heavyweight hoodie in stone grey and cream",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A premium double-faced heavyweight hoodie with drop shoulders, clean finish seams, and zero exterior drawcords. Engineered for comfort and architectural form, maintaining its structured shape throughout the day.",
    details: [
      "Ultra-heavyweight cotton fleece (450 GSM)",
      "Double-lined hood without drawcords",
      "Kangaroo pocket with concealed side entries",
      "Ribbed cuffs and waistband",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Machine wash cold inside out on gentle cycle",
      "Dry flat in shade",
      "Do not tumble dry",
      "Warm iron if needed"
    ],
    rating: 4.9,
    reviews: [
      { id: 1, author: "Marco K.", rating: 5, date: "July 10, 2026", comment: "Outstanding thickness. The hood stands up perfectly. Truly a premium piece." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Chest", "Length", "Sleeve"],
      rows: [
        { size: "XS", chest: "44", length: "26.5", sleeve: "31.5" },
        { size: "S",  chest: "46", length: "27.5", sleeve: "32.5" },
        { size: "M",  chest: "48", length: "28.5", sleeve: "33.5" },
        { size: "L",  chest: "50", length: "29.5", sleeve: "34.5" },
        { size: "XL", chest: "52", length: "30.5", sleeve: "35.5" }
      ],
      notes: "Designed for a generous oversized fit. Size down for a more standard fit."
    }
  },
  {
    id: 6,
    name: "VESTIGIA ORIGIN CAP",
    category: "Accessories",
    productType: "Organic Cotton Monogram Cap",
    price: 45,
    badge: "Essential",
    colors: ["#1c1a1a"],
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=85",
    images: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=1000&q=85"
    ],
    alt: "VESTIGIA Origin Cap - Organic cotton monogram cap in charcoal black",
    sizes: ["OS"],
    description: "Constructed from organic cotton twill, the Origin Cap features an adjustable metal buckle strap and a clean embroidered brand monogram on the front panel. A timeless accessory designed to complete any minimal outfit.",
    details: [
      "100% organic cotton twill",
      "6-panel structured construction",
      "Embroidered tone-on-tone VESTIGIA monogram front graphic",
      "Adjustable metal buckle backstrap",
      "Proudly made in Sri Lanka",
      "Designed in Italy"
    ],
    care: [
      "Hand wash cold only",
      "Do not bleach or dry clean",
      "Reshape while damp and dry flat in shade"
    ],
    rating: 4.7,
    reviews: [
      { id: 1, author: "Lucas V.", rating: 4.7, date: "July 12, 2026", comment: "Great fit and build quality. The monogram is very subtle, which I love." }
    ],
    sizeChart: {
      unit: "in",
      columns: ["Size", "Circumference", "Brim Width"],
      rows: [
        { size: "OS", circumference: "21.5 - 24.0", brimWidth: "2.75" }
      ],
      notes: "One size fits most with adjustable metal backstrap."
    }
  }
];

export const products: Product[] = [...heroProducts];

export const collections: Collection[] = [];

export const journalArticles: JournalArticle[] = [
  {
    id: 1,
    title: "The Architecture of Weight: Our 280 GSM Heavyweight Jersey",
    date: "June 28, 2026",
    readTime: "4 min read",
    excerpt: "Structure meets drape in our first release. An inquiry into the fabric density that defines the VESTIGIA Signature T-shirt.",
    content: [
      "At VESTIGIA, we believe that fabric is the architecture of garment creation. For our first release, the Signature Tee, we spent months developing a cotton jersey that carries its own form, providing a clean, structured silhouette without compromising on breathability.",
      "The result is our 280 GSM heavyweight cotton. GSM, or grams per square meter, is the standard metric for fabric density. While typical retail T-shirts sit between 130 and 160 GSM, our choice of 280 GSM offers an intentional, heavy feel that hangs beautifully from the shoulders and resists distortion over time.",
      "This density is paired with raw, long-staple cotton fibers spun to minimize hairiness. The knit is tight but breathable, ensuring the garment moves with you through urban environments while retaining the clean lines and visual poise that Italian creative direction demands."
    ],
    image: "/images/products/signature_detail.png"
  },
  {
    id: 2,
    title: "Rome to Colombo: A Design and Craft Exchange",
    date: "June 14, 2026",
    readTime: "3 min read",
    excerpt: "From design studios in Italy to high-precision apparel production in Sri Lanka, VESTIGIA bridges two distinct worlds of garment expertise.",
    content: [
      "The design identity of VESTIGIA is born in Italy—shaped by Mediterranean stone textures, quiet minimalist design traditions, and contemporary streetwear proportions. The visual language of the brand values restraint, focusing on clean lines, deep neutral tones, and subtle markings.",
      "However, the realization of this vision takes place in Sri Lanka. Home to some of the world's most sophisticated and ethical apparel manufacturers, Sri Lanka is a global leader in high-end knitwear and precision garment production.",
      "By combining Italian creative direction with Sri Lankan manufacturing craftsmanship, we create clothing that exists between cultures, place, and expertise. This collaboration results in premium T-shirts with clean stitching, durable constructions, and an authentic origin story."
    ],
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: 3,
    title: "Restraint as a Concept: The Three-Piece Release",
    date: "May 29, 2026",
    readTime: "5 min read",
    excerpt: "Why we chose to launch VESTIGIA with exactly three T-shirts. An editorial exploration of minimalism, focus, and intentional wardrobing.",
    content: [
      "The modern fashion cycle is fast, cluttered, and overwhelming. Brands release dozens of styles each month, urging shoppers to consume constantly. VESTIGIA rejects this approach.",
      "We launched our brand with exactly three garments: the Signature Tee, the Origin Tee, and the Essential Tee. This limitation is not a constraint, but an intentional choice. It represents our commitment to focus, restraint, and quality over sheer volume.",
      "By launching only three T-shirts, we ensure that each piece has been meticulously considered, refined, and tested. Every seam is intentional, every fit is perfected, and every fabric selection is optimized. We offer foundations for a lifetime of wear, designed to remain relevant beyond a single season."
    ],
    image: "/images/products/signature_model.png"
  }
];
