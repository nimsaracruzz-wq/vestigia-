import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Story() {
  useEffect(() => {
    document.title = "Our Story — VESTIGIA";
  }, []);

  const slideUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6 },
  };

  const paragraphStyle = {
    fontSize: "1rem",
    lineHeight: 1.8,
    color: "#444",
    fontWeight: 300,
    maxWidth: "560px",
    margin: "0 0 18px",
  };

  return (
    <motion.div
      className="story-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: "#fff", color: "#171412", minHeight: "100vh" }}
    >
      {/* PAGE HERO */}
      <header
        className="story-hero"
        style={{
          padding: "140px 24px 100px",
          textAlign: "center",
          background: "#f6f3ed",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4.2rem)", fontWeight: 400, margin: "0 0 28px", letterSpacing: "0.02em", lineHeight: 1.1 }}>
            THE TRACES WE LEAVE.
          </h1>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <p style={{ fontSize: "1.15rem", lineHeight: 1.8, color: "#444", margin: "0 0 18px", fontWeight: 300 }}>
              VESTIGIA comes from the Latin word for "traces" — the marks left behind by a life lived.
            </p>
            <p style={{ fontSize: "1.15rem", lineHeight: 1.8, color: "#444", margin: "0 0 18px", fontWeight: 300 }}>
              A journey. A place. A moment.
              <br />
              The people we meet and the places we pass through become part of us.
            </p>
            <p style={{ fontSize: "1.15rem", lineHeight: 1.8, color: "#444", margin: 0, fontWeight: 300 }}>
              VESTIGIA is about those traces.
            </p>
          </div>
        </div>
      </header>

      {/* STORY MOVEMENT PANEL */}
      <section style={{ padding: "100px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <motion.div {...slideUp} style={{ marginBottom: "80px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "16px" }}>
            01 / MOVEMENT
          </h2>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 400, margin: "0 0 20px" }}>
            MADE TO MOVE.
          </h3>
          <p style={paragraphStyle}>
            We believe clothing should move with life.
          </p>
          <p style={paragraphStyle}>
            From city streets to distant shores, from morning light to late nights, every day takes us somewhere different.
          </p>
          <p style={paragraphStyle}>
            Our pieces are designed for that movement — relaxed, considered, and effortless.
          </p>
          <p style={paragraphStyle}>
            Not made for one moment.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            <strong>Made to move through many.</strong>
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: "80px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "16px" }}>
            02 / ORIGIN
          </h2>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 400, margin: "0 0 20px" }}>
            BETWEEN TWO WORLDS.
          </h3>
          <p style={paragraphStyle}>
            VESTIGIA was born between <strong>Italy and Sri Lanka</strong>.
          </p>
          <p style={paragraphStyle}>
            Rome gives us structure — its architecture, proportions, history, and timeless sense of form.
          </p>
          <p style={paragraphStyle}>
            Sri Lanka gives us something different — warmth, coastline, earth, light, and a slower rhythm of life.
          </p>
          <p style={paragraphStyle}>
            We bring these contrasts together.
          </p>
          <p style={paragraphStyle}>
            <strong>
              Structure and softness.
              <br />
              Heritage and modernity.
              <br />
              City and coast.
            </strong>
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            This is the space where VESTIGIA exists.
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: "80px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "16px" }}>
            03 / EXPERIENCE
          </h2>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 400, margin: "0 0 20px" }}>
            WHAT WE FEEL BECOMES WHAT WE REMEMBER.
          </h3>
          <p style={paragraphStyle}>
            A garment becomes more than a garment through the life it shares with us.
          </p>
          <p style={paragraphStyle}>
            The places it travels.
            <br />
            The days it witnesses.
            <br />
            The moments it becomes part of.
          </p>
          <p style={paragraphStyle}>
            We choose materials and silhouettes with this in mind — pieces that feel natural from the first wear and become increasingly personal over time.
          </p>
          <p style={paragraphStyle}>
            Because perfection isn't always about staying untouched.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Sometimes, <strong>it is about becoming yours.</strong>
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "16px" }}>
            04 / TRACE
          </h2>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 400, margin: "0 0 20px" }}>
            WE LEAVE SOMETHING BEHIND.
          </h3>
          <p style={paragraphStyle}>
            Every VESTIGIA piece carries a story.
          </p>
          <p style={paragraphStyle}>
            The <strong>Signature Tee</strong> — defined by its structured silhouette.
          </p>
          <p style={paragraphStyle}>
            The <strong>Origin Tee</strong> — marked by the coordinates of where our story begins.
          </p>
          <p style={paragraphStyle}>
            The <strong>Essential Tee</strong> — reduced to what matters.
          </p>
          <p style={paragraphStyle}>
            Different expressions.
          </p>
          <p style={paragraphStyle}>
            One philosophy.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: "32px" }}>
            <strong>Wear it. Live in it. Leave your trace.</strong>
          </p>
        </motion.div>
      </section>

      {/* MIDDLE IMAGE SPREAD */}
      <section style={{ overflow: "hidden", padding: "0 24px", marginBottom: "80px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <img
            src="/images/products/signature_model.png"
            alt="Model in VESTIGIA Signature T-Shirt"
            style={{ width: "100%", objectFit: "cover", height: "400px" }}
          />
          <img
            src="/images/products/signature_detail.png"
            alt="Macro detail of VESTIGIA knit fabric"
            style={{ width: "100%", objectFit: "cover", height: "400px" }}
          />
        </div>
      </section>

      {/* FINAL BRAND OUTRO */}
      <footer
        className="story-footer"
        style={{
          background: "#f6f3ed",
          padding: "100px 24px",
          textAlign: "center",
          borderTop: "1px solid #eaeaea",
        }}
      >
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 400, color: "#171412", margin: "0 0 18px", letterSpacing: "0.02em", lineHeight: 1.1 }}>
            VESTIGIA
          </h2>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", fontWeight: 400, color: "#171412", margin: "0 0 32px", letterSpacing: "0.04em" }}>
            CLOTHING FOR THE JOURNEY.
          </h3>
          <p style={{ color: "#555", lineHeight: 1.8, fontSize: "1rem", fontWeight: 300, margin: "0 0 18px" }}>
            We don't design clothes for a single destination.
          </p>
          <p style={{ color: "#555", lineHeight: 1.8, fontSize: "1rem", fontWeight: 300, margin: "0 0 28px" }}>
            We design them for everywhere life takes you.
          </p>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.9, margin: "0 0 36px" }}>
            <strong>
              ITALY × SRI LANKA
              <br />
              CRAFTED BEYOND TIME.
            </strong>
          </p>
          <Link className="primary-link dark" to="/shop">
            SHOP THE FIRST RELEASE →
          </Link>
        </div>
      </footer>
    </motion.div>
  );
}
