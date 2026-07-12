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
