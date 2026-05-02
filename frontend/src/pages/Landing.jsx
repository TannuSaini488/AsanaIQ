import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Users, Zap, ShieldCheck, ArrowRight, Star, 
  Heart, Brain, Activity, Sun, Moon, Dumbbell, Sparkles
} from 'lucide-react';

const Landing = () => {
  const images = {
    hero: "/assets/yoga_hero.png",
    flexibility: "/assets/yoga_flexibility.png",
    meditation: "/assets/yoga_meditation.png",
    community: "/assets/yoga_community.png",
    aiMatching: "/assets/ai_matching.png",
    videoSession: "/assets/video_session.png",
    sleep: "/assets/image.png"
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="landing-page" style={{ ...styles.landingWrapper, minHeight: '100vh' }}>
      {/* 1. HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.container}>
          <div style={styles.heroContent}>
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={styles.heroText}
            >
              <div style={styles.badge}>
                <Sparkles size={14} style={{ marginRight: 8 }} /> 
                Next-Gen Yoga Platform
              </div>
              <h1 style={styles.mainTitle}>
                Find Your Balance with <span style={styles.gradientText}>AsanaIQ</span>
              </h1>
              <p style={styles.subTitle}>
                Experience the ultimate synergy of ancient wisdom and modern AI. 
                Connect with world-class trainers and transform your life today.
              </p>
              <div style={styles.ctaGroup}>
                <Link to="/register" style={styles.primaryBtn}>
                  Get Started for Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" style={styles.secondaryBtn}>
                  Trainer Login
                </Link>
              </div>
              <div style={styles.trustRow}>
                <div style={styles.trustItem}><Users size={16} /> 10k+ Members</div>
                <div style={styles.trustItem}><Star size={16} color="#F59E0B" /> 4.9/5 Rating</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotateZ: -5 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              transition={{ duration: 1 }}
              whileHover={{ rotateY: 5, rotateX: -5 }}
              style={styles.heroImageWrapper}
            >
              <img src={images.hero} alt="Yoga Hero" style={styles.heroImage} />
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 4 }}
                style={styles.floatingCard}
              >
                <Zap size={20} color="#8B5CF6" />
                <span>AI Plan Generated!</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. YOGA BENEFITS SECTION */}
      <section style={styles.benefitsSection}>
        <div style={styles.container}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            style={styles.sectionHeader}
          >
            <h2 style={styles.sectionTitle}>Holistic Benefits of Yoga</h2>
            <p style={styles.sectionDesc}>Discover how yoga transforms your body, mind, and soul.</p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={styles.benefitsGrid}
          >
            <BenefitCard 
              icon={<Heart size={28} color="#EF4444" />}
              title="Physical Vitality"
              desc="Improve cardiovascular health, boost metabolism, and increase physical stamina through dynamic flows."
              image={images.flexibility}
            />
            <BenefitCard 
              icon={<Brain size={28} color="#3B82F6" />}
              title="Mental Clarity"
              desc="Reduce stress and anxiety while improving focus and cognitive function with mindful meditation."
              image={images.meditation}
            />
            <BenefitCard 
              icon={<Activity size={28} color="#10B981" />}
              title="Incredible Flexibility"
              desc="Stretch beyond your limits, improve posture, and alleviate chronic pain in joints and muscles."
              image={images.community}
            />
            <BenefitCard 
              icon={<Moon size={28} color="#8B5CF6" />}
              title="Restorative Sleep"
              desc="Master relaxation techniques that calm the nervous system and promote deep, restorative sleep."
              image={images.sleep}
            />
          </motion.div>
        </div>
      </section>

      {/* 2.5 PLATFORM FEATURES SECTION */}
      <section style={styles.platformFeaturesSection}>
        <div style={styles.container}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            style={styles.sectionHeader}
          >
            <h2 style={styles.sectionTitle}>Built for Your Growth</h2>
            <p style={styles.sectionDesc}>Powerful tools designed to make your yoga journey seamless and effective.</p>
          </motion.div>

          <div style={styles.featureColumn}>
            {/* Feature 1: AI Matching */}
            <div style={styles.splitFeatureRow}>
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                style={styles.splitFeatureImage}
              >
                <img src={images.aiMatching} alt="AI Matching" style={styles.featureImg} />
              </motion.div>
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                style={styles.splitFeatureText}
              >
                <div style={styles.featureNumber}>01</div>
                <h3 style={styles.h3Title}>Intelligent AI Matching</h3>
                <p style={styles.pText}>
                  No more guessing. Our proprietary AI analyzes your physical profile, goals, 
                  and even past injuries to find the trainer who is truly the best fit for your unique needs.
                </p>
                <Link to="/register" style={styles.textLink}>Try AI Matching <ArrowRight size={16} /></Link>
              </motion.div>
            </div>

            {/* Feature 2: Live Video Sessions */}
            <div style={styles.splitFeatureRowReverse}>
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                style={styles.splitFeatureImage}
              >
                <img src={images.videoSession} alt="Video Session" style={styles.featureImg} />
              </motion.div>
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                style={styles.splitFeatureText}
              >
                <div style={styles.featureNumber}>02</div>
                <h3 style={styles.h3Title}>High-Definition Video Calls</h3>
                <p style={styles.pText}>
                  Experience one-on-one sessions as if you were in the same room. 
                  Our integrated video platform is optimized for clarity, ensuring your trainer 
                  can see every alignment and provide real-time corrections.
                </p>
                <Link to="/register" style={styles.textLink}>Book a Session <ArrowRight size={16} /></Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE FEATURE SECTION */}
      <section style={styles.featureHighlightSection}>
        <div style={styles.container}>
          <div style={styles.featureRow}>
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              style={styles.featureImageSide}
            >
              <img src={images.meditation} alt="Meditation" style={styles.roundedImage} />
            </motion.div>
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              style={styles.featureTextSide}
            >
              <div style={styles.smallBadge}>MINDFULNESS</div>
              <h2 style={styles.h2Title}>Master Your Inner Peace</h2>
              <p style={styles.pText}>
                Our AI-guided meditation sessions help you find tranquility in a chaotic world. 
                Whether you're a beginner or an expert, we match you with the perfect routine.
              </p>
              <ul style={styles.featureList}>
                <li><CheckCircle size={18} color="#8B5CF6" /> Personalized Stress Relief</li>
                <li><CheckCircle size={18} color="#8B5CF6" /> Deep Breathing Techniques</li>
                <li><CheckCircle size={18} color="#8B5CF6" /> Sleep Quality Improvement</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION SECTION */}
      <section style={styles.ctaBannerSection}>
        <div style={styles.container}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            style={styles.ctaBanner}
          >
            <h2 style={styles.ctaTitle}>Ready to transform your life?</h2>
            <p style={styles.ctaText}>Join AsanaIQ today and start your 7-day free trial with any trainer.</p>
            <Link to="/register" style={styles.ctaBtn}>
              Join the Community Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerContent}>
            <div style={styles.footerBrand}>
              <h3 style={styles.footerLogo}>AsanaIQ</h3>
              <p style={styles.footerTagline}>The future of personalized yoga.</p>
            </div>
            <div style={styles.footerLinks}>
              <Link to="/about">About</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
          <div style={styles.footerBottom}>
            © 2026 AsanaIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const BenefitCard = ({ icon, title, desc, image }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    style={styles.benefitCard}
  >
    <div style={styles.cardImageWrapper}>
      <img src={image} alt={title} style={styles.cardImage} />
    </div>
    <div style={styles.cardContent}>
      <div style={styles.cardIcon}>{icon}</div>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardDesc}>{desc}</p>
    </div>
  </motion.div>
);

const styles = {
  landingWrapper: {
    backgroundColor: '#FAFAF9',
    color: '#1C1917',
    fontFamily: "'Inter', sans-serif",
    overflowX: 'hidden',
  },
  container: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '0 40px',
  },
  heroSection: {
    padding: '140px 0 100px 0',
    backgroundColor: '#fff',
    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
  },
  heroContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '80px',
    flexWrap: 'wrap',
  },
  heroText: {
    flex: 1,
    minWidth: '320px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: '#8B5CF6',
    borderRadius: '100px',
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '32px',
  },
  mainTitle: {
    fontSize: '64px',
    lineHeight: '1.1',
    fontWeight: '900',
    marginBottom: '24px',
    letterSpacing: '-0.03em',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #8B5CF6 0%, #D946EF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subTitle: {
    fontSize: '22px',
    color: '#78716C',
    lineHeight: '1.6',
    marginBottom: '40px',
    maxWidth: '540px',
  },
  ctaGroup: {
    display: 'flex',
    gap: '16px',
    marginBottom: '48px',
  },
  primaryBtn: {
    backgroundColor: '#8B5CF6',
    color: '#fff',
    padding: '18px 36px',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '700',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.5)',
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    color: '#0F172A',
    padding: '18px 36px',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '700',
    textDecoration: 'none',
    border: '2px solid #E7E5E4',
    transition: 'all 0.3s ease',
  },
  trustRow: {
    display: 'flex',
    gap: '32px',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    color: '#78716C',
    fontWeight: '600',
  },
  heroImageWrapper: {
    flex: 1,
    minWidth: '400px',
    position: 'relative',
    perspective: '1000px',
  },
  heroImage: {
    width: '100%',
    borderRadius: '32px',
    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.2)',
  },
  floatingCard: {
    position: 'absolute',
    top: '40px',
    right: '-20px',
    backgroundColor: '#fff',
    padding: '16px 24px',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '700',
    border: '1px solid #F5F5F4',
  },
  benefitsSection: {
    padding: '140px 0',
    backgroundColor: '#FAFAF9',
  },
  platformFeaturesSection: {
    padding: '120px 0',
    backgroundColor: '#fff',
  },
  featureColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '120px',
  },
  splitFeatureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '80px',
    flexWrap: 'wrap',
  },
  splitFeatureRowReverse: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: '80px',
    flexWrap: 'wrap',
  },
  splitFeatureImage: {
    flex: 1,
    minWidth: '400px',
  },
  splitFeatureText: {
    flex: 1,
    minWidth: '320px',
  },
  featureImg: {
    width: '100%',
    borderRadius: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },
  featureNumber: {
    fontSize: '48px',
    fontWeight: '900',
    color: 'rgba(139, 92, 246, 0.15)',
    marginBottom: '-20px',
    fontFamily: 'serif',
  },
  textLink: {
    color: '#8B5CF6',
    fontWeight: '700',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    transition: 'gap 0.3s ease',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '80px',
  },
  sectionTitle: {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  sectionDesc: {
    fontSize: '20px',
    color: '#78716C',
    maxWidth: '600px',
    margin: '0 auto',
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
  },
  benefitCard: {
    backgroundColor: '#fff',
    borderRadius: '32px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #F5F5F4',
    transition: 'all 0.3s ease',
  },
  cardImageWrapper: {
    height: '180px',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
  },
  cardContent: {
    padding: '24px',
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#FAFAF9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '800',
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#78716C',
    lineHeight: '1.5',
  },
  featureHighlightSection: {
    padding: '120px 0',
    backgroundColor: '#fff',
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '80px',
    flexWrap: 'wrap',
  },
  featureImageSide: {
    flex: 1,
    minWidth: '400px',
  },
  roundedImage: {
    width: '100%',
    borderRadius: '40px',
    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)',
  },
  featureTextSide: {
    flex: 1,
    minWidth: '320px',
  },
  smallBadge: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  h2Title: {
    fontSize: '42px',
    fontWeight: '800',
    marginBottom: '24px',
  },
  pText: {
    fontSize: '18px',
    color: '#78716C',
    lineHeight: '1.7',
    marginBottom: '32px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  ctaBannerSection: {
    padding: '120px 0',
    backgroundColor: '#fff',
  },
  ctaBanner: {
    backgroundColor: '#8B5CF6',
    borderRadius: '40px',
    padding: '80px 40px',
    textAlign: 'center',
    color: '#fff',
    backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    boxShadow: '0 30px 60px -15px rgba(139, 92, 246, 0.4)',
  },
  ctaTitle: {
    fontSize: '42px',
    fontWeight: '900',
    marginBottom: '20px',
  },
  ctaText: {
    fontSize: '20px',
    marginBottom: '40px',
    opacity: 0.9,
  },
  ctaBtn: {
    backgroundColor: '#fff',
    color: '#8B5CF6',
    padding: '20px 40px',
    borderRadius: '20px',
    fontSize: '20px',
    fontWeight: '800',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.3s ease',
  },
  footer: {
    padding: '100px 0 60px 0',
    backgroundColor: '#FAFAF9',
    borderTop: '1px solid #E7E5E4',
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '40px',
    marginBottom: '60px',
  },
  footerBrand: {
    maxWidth: '300px',
  },
  footerLogo: {
    fontSize: '28px',
    fontWeight: '900',
    marginBottom: '12px',
    background: 'linear-gradient(90deg, #8B5CF6 0%, #D946EF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  footerTagline: {
    color: '#78716C',
    fontSize: '16px',
  },
  footerLinks: {
    display: 'flex',
    gap: '32px',
  },
  footerBottom: {
    textAlign: 'center',
    paddingTop: '40px',
    borderTop: '1px solid #E7E5E4',
    color: '#A8A29E',
    fontSize: '14px',
  }
};

export default Landing;
