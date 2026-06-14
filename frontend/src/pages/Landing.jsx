import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, Zap, ShieldCheck, ArrowRight, Star, 
  Heart, Brain, Activity, Sun, Leaf
} from 'lucide-react';

const Landing = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut", delay }
    })
  };

  const fadeInDown = {
    hidden: { opacity: 0, y: -40 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut", delay }
    })
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (delay = 0) => ({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut", delay }
    })
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  return (
    <div className="landing-page" style={styles.landingWrapper}>
      {/* HERO SECTION WITH VIDEO BACKGROUND */}
      <section style={styles.heroSection}>
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          style={styles.backgroundVideo}
        >
          <source src="https://res.cloudinary.com/drgqsqxtx/video/upload/v1781447138/7580347-uhd-3840-2160-25fps_icTz4OFt_iejgxt.mp4" type="video/mp4" />
        </video>

        {/* Overlay Gradient */}
        <div style={styles.videoOverlay}></div>

        {/* Content */}
        <div style={styles.heroContainer}>
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeInDown}
            style={styles.heroBadge}
          >
            <Leaf size={16} style={{ marginRight: 8 }} />
            <span>Welcome to Your Wellness Journey</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={0.2}
            variants={fadeInUp}
            style={styles.heroTitle}
          >
            Find Your <span style={styles.gradientText}>Perfect Balance</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={0.4}
            variants={fadeInUp}
            style={styles.heroSubtitle}
          >
            Connect with certified yoga trainers powered by AI. 
            <br />
            Experience personalized sessions tailored to your unique needs.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.6}
            variants={fadeInUp}
            style={styles.ctaButtonGroup}
          >
            <Link to="/register" style={styles.primaryButton}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Journey
                <ArrowRight size={20} style={{ marginLeft: 8 }} />
              </motion.div>
            </Link>
            <Link to="/login" style={styles.secondaryButton}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Trainer Login
              </motion.div>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.8}
            variants={fadeInUp}
            style={styles.trustIndicators}
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={styles.trustCard}
            >
              <Users size={24} style={{ color: '#06B6D4' }} />
              <div>
                <div style={styles.trustNumber}>10K+</div>
                <div style={styles.trustLabel}>Active Members</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              style={styles.trustCard}
            >
              <Star size={24} style={{ color: '#F59E0B' }} />
              <div>
                <div style={styles.trustNumber}>4.9/5</div>
                <div style={styles.trustLabel}>Trainer Rating</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              style={styles.trustCard}
            >
              <Heart size={24} style={{ color: '#EC4899' }} />
              <div>
                <div style={styles.trustNumber}>98%</div>
                <div style={styles.trustLabel}>Satisfaction</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <motion.div
          style={styles.floatingOrb1}
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        ></motion.div>
        <motion.div
          style={styles.floatingOrb2}
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        ></motion.div>
      </section>

      {/* BENEFITS SECTION */}
      <section style={styles.benefitsSection}>
        <div style={styles.container}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            style={styles.benefitsContent}
          >
            <motion.div variants={fadeInUp} style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                Why Choose <span style={styles.gradientText}>AsanaIQ?</span>
              </h2>
              <p style={styles.sectionDescription}>
                Transform your yoga practice with intelligent matching and personalized guidance
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              style={styles.benefitGrid}
            >
              {[
                {
                  icon: Brain,
                  title: "AI-Powered Matching",
                  description: "Our intelligent algorithm matches you with the perfect trainer based on your goals and style"
                },
                {
                  icon: Activity,
                  title: "Personalized Plans",
                  description: "Get custom yoga routines tailored to your fitness level, injuries, and aspirations"
                },
                {
                  icon: Heart,
                  title: "Holistic Wellness",
                  description: "Balance body, mind, and spirit with guidance from certified professionals"
                },
                {
                  icon: Sun,
                  title: "Flexible Scheduling",
                  description: "Train anytime, anywhere with live sessions that fit your busy lifestyle"
                },
                {
                  icon: Zap,
                  title: "Progress Tracking",
                  description: "Monitor your improvement with AI-generated weekly insights and feedback"
                },
                {
                  icon: ShieldCheck,
                  title: "Safe & Certified",
                  description: "All trainers are verified professionals with expertise in injury prevention"
                }
              ].map((benefit, idx) => (
                <motion.div
                  key={idx}
                  variants={scaleIn}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                  style={styles.benefitCard}
                >
                  <div style={styles.benefitIconWrapper}>
                    <benefit.icon size={32} style={{ color: '#06B6D4' }} />
                  </div>
                  <h3 style={styles.benefitTitle}>{benefit.title}</h3>
                  <p style={styles.benefitDescription}>{benefit.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={styles.ctaSection}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          style={styles.ctaContent}
        >
          <h2 style={styles.ctaTitle}>Ready to Transform Your Practice?</h2>
          <p style={styles.ctaDescription}>
            Join thousands of students on their yoga journey. Start free today.
          </p>
          <Link to="/register" style={styles.ctaButton}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Begin Your Free Trial
            </motion.div>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  landingWrapper: {
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    color: '#1F2937',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #F5F3FF 100%)'
  },

  // ============ HERO SECTION ============
  heroSection: {
    position: 'relative',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },

  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    zIndex: 1
  },

  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(40, 15, 70, 0.35) 50%, rgba(10, 15, 30, 0.45) 100%)',
    zIndex: 2,
    backdropFilter: 'blur(1px)'
  },

  heroContainer: {
    position: 'relative',
    zIndex: 3,
    textAlign: 'center',
    maxWidth: '920px',
    paddingBottom: '40px',
    animation: 'fadeInScale 0.8s ease-out'
  },

  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    padding: '11px 22px',
    borderRadius: '50px',
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '28px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    letterSpacing: '0.08em',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease'
  },

  heroTitle: {
    fontSize: '76px',
    fontWeight: '700',
    lineHeight: '1.1',
    marginBottom: '28px',
    color: '#FFFFFF',
    letterSpacing: '-0.8px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.3)',
    fontFamily: "'Poppins', sans-serif",
    fontSmoothing: 'antialiased',
    wordSpacing: '0.1em'
  },

  heroSubtitle: {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: '48px',
    lineHeight: '1.8',
    fontWeight: '400',
    textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
    maxWidth: '720px',
    margin: '0 auto 48px',
    letterSpacing: '0.2px',
    fontFamily: "'Poppins', sans-serif"
  },

  ctaButtonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '60px'
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: 'white',
    padding: '15px 44px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '15px',
    textDecoration: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(6, 182, 212, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    border: 'none',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    letterSpacing: '0.4px',
    fontFamily: "'Poppins', sans-serif"
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    color: 'rgba(255, 255, 255, 0.95)',
    padding: '15px 44px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '15px',
    textDecoration: 'none',
    cursor: 'pointer',
    border: '1.5px solid rgba(255, 255, 255, 0.25)',
    transition: 'all 0.3s ease',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    letterSpacing: '0.4px',
    fontFamily: "'Poppins', sans-serif"
  },

  trustIndicators: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  trustCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.07)',
    backdropFilter: 'blur(20px)',
    padding: '16px 26px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
  },

  trustNumber: {
    fontSize: '18px',
    fontWeight: '700',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    color: 'rgba(255, 255, 255, 0.98)',
    letterSpacing: '-0.3px'
  },

  trustLabel: {
    fontSize: '12px',
    opacity: 0.85,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: '0.05em'
  },

  floatingOrb1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '50%',
    top: '10%',
    right: '-50px',
    zIndex: 0,
    filter: 'blur(40px)'
  },

  floatingOrb2: {
    position: 'absolute',
    width: '250px',
    height: '250px',
    background: 'rgba(168, 85, 247, 0.1)',
    borderRadius: '50%',
    bottom: '20%',
    left: '-40px',
    zIndex: 0,
    filter: 'blur(40px)'
  },

  gradientText: {
    background: 'linear-gradient(135deg, #00D9FF 0%, #9D4EDD 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'inline-block',
    fontWeight: 'inherit',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
  },

  // ============ BENEFITS SECTION ============
  benefitsSection: {
    padding: '120px 20px',
    background: '#FFFFFF'
  },

  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },

  benefitsContent: {
    width: '100%'
  },

  sectionHeader: {
    textAlign: 'center',
    marginBottom: '80px'
  },

  sectionTitle: {
    fontSize: '48px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#1F2937',
    lineHeight: '1.2'
  },

  sectionDescription: {
    fontSize: '18px',
    color: '#6B7280',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6'
  },

  benefitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px'
  },

  benefitCard: {
    background: 'linear-gradient(135deg, #F0F9FF 0%, #F5F3FF 100%)',
    padding: '40px 32px',
    borderRadius: '16px',
    textAlign: 'center',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  },

  benefitIconWrapper: {
    width: '64px',
    height: '64px',
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    transition: 'all 0.3s ease'
  },

  benefitTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#1F2937'
  },

  benefitDescription: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: '1.6'
  },

  // ============ CTA SECTION ============
  ctaSection: {
    padding: '100px 20px',
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    textAlign: 'center'
  },

  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },

  ctaTitle: {
    fontSize: '48px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '20px',
    lineHeight: '1.2'
  },

  ctaDescription: {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '40px',
    lineHeight: '1.6'
  },

  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    color: '#06B6D4',
    padding: '16px 48px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
  }
};

export default Landing;
