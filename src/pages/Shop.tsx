import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { products, type Product } from "../data";
import ProductCard from "../components/common/ProductCard";

type ShopProps = {
  onQuickShop: (product: Product) => void;
};

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

export default function Shop({ onQuickShop }: ShopProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Load initial filters from URL params
  const categoryParam = searchParams.get("category") || "All";
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [priceRange, setPriceRange] = useState<number>(200);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sync state if search params change externally
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  // Set document metadata title
  useEffect(() => {
    document.title = "Shop Collection | Vestigia | Sustainable Tailored Apparel";
  }, []);

  // Extract unique colors and sizes for filter UI dynamically
  const { colors, sizes } = useMemo(() => {
    const allColors = new Set<string>();
    const allSizes = new Set<string>();
    products.forEach((p) => {
      p.colors.forEach((c) => allColors.add(c));
      p.sizes.forEach((s) => allSizes.add(s));
    });
    return {
      colors: Array.from(allColors),
      sizes: Array.from(allSizes).sort(),
    };
  }, []);

  // Filter products logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category check
        if (selectedCategory !== "All" && p.category !== selectedCategory) {
          return false;
        }
        // Price check
        if (p.price > priceRange) {
          return false;
        }
        // Color check
        if (selectedColor && !p.colors.includes(selectedColor)) {
          return false;
        }
        // Size check
        if (selectedSizes.length > 0) {
          const hasMatchingSize = p.sizes.some((sz) => selectedSizes.includes(sz));
          if (!hasMatchingSize) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort logic
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        return 0; // 'featured' keeps index sorting
      });
  }, [selectedCategory, priceRange, selectedColor, selectedSizes, sortBy]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === "All") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", category);
    }
    setSearchParams(searchParams);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearFilters = () => {
    setSelectedCategory("All");
    setPriceRange(200);
    setSelectedColor(null);
    setSelectedSizes([]);
    setSortBy("featured");
    setSearchParams({});
  };

  return (
    <motion.div
      className="shop-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="shop-header-banner">
        <p>Vestigia Collection</p>
        <h1>Shop the Closet</h1>
        <span>Browse all items, tailored with intent and crafted from conscious fabrics.</span>
      </div>

      <div className="shop-toolbar-row">
        <button
          className="sidebar-toggle-btn"
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <SlidersHorizontal size={16} />
          <span>{isSidebarOpen ? "Hide Filters" : "Show Filters"}</span>
        </button>

        <div className="sort-menu-container">
          <label htmlFor="sort-dropdown">Sort by:</label>
          <div className="select-wrapper">
            <select
              id="sort-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
        </div>
      </div>

      <div className="shop-layout-grid">
        {/* Filter Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              className="shop-sidebar-filters"
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: "260px", opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Category Filter */}
              <div className="filter-group">
                <h3>Category</h3>
                <div className="filter-options-column">
                  {["All", "New", "Clothing", "Accessories", "Sale"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`filter-text-btn ${selectedCategory === cat ? "active" : ""}`}
                      onClick={() => handleCategoryChange(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="filter-group">
                <h3>Max Price (${priceRange})</h3>
                <div className="price-slider-wrapper">
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="10"
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>$40</span>
                    <span>$200</span>
                  </div>
                </div>
              </div>

              {/* Color Swatch Filter */}
              <div className="filter-group">
                <h3>Color</h3>
                <div className="color-filter-swatches">
                  <button
                    type="button"
                    className={`clear-color-btn ${selectedColor === null ? "active" : ""}`}
                    onClick={() => setSelectedColor(null)}
                    title="All colors"
                  >
                    All
                  </button>
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-filter-swatch-item ${selectedColor === color ? "active" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Filter by color ${color}`}
                    >
                      {selectedColor === color && <Check size={10} color={color === "#ffffff" ? "#000" : "#fff"} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes Filter */}
              <div className="filter-group">
                <h3>Sizes</h3>
                <div className="sizes-filter-grid">
                  {sizes.map((size) => {
                    const isChecked = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`size-filter-checkbox-btn ${isChecked ? "active" : ""}`}
                        onClick={() => handleSizeToggle(size)}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear button */}
              <button
                type="button"
                className="clear-all-filters-btn"
                onClick={clearFilters}
              >
                Reset All Filters
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Product Catalog Grid */}
        <div className="shop-product-results">
          {filteredProducts.length === 0 ? (
            <div className="no-products-found">
              <p>No products match your selected filters.</p>
              <button type="button" onClick={clearFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <motion.div
              className="product-grid"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickShop={() => onQuickShop(product)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
