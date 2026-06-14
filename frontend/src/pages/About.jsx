import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShieldCheck, Target, Users, Zap, Globe } from 'lucide-react';

const About = () => {
  const aboutImage = "https://res.cloudinary.com/drgqsqxtx/image/upload/v1781446653/yoga_meditation_gaxdbw.jpg"; // Reusing high-quality asset

  return (
    <div className="about-page" style={styles.pageWrapper}>
      {/* 1. HERO / STORY SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.container}>
          <div style={styles.heroRow}>
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={styles.heroTextSide}
            >
              <div style={styles.badge}>OUR STORY</div>
              <h1 style={styles.mainTitle}>Bridging Technology & <span style={styles.gradientText}>Inner Peace</span></h1>
              <p style={styles.pText}>
                AsanaIQ was born from a simple vision: to make high-quality, personalized yoga 
                accessible to everyone, anywhere. We believe that technology should serve 
                well-being, not distract from it.
              </p>
              <p style={styles.pText}>
                By combining state-of-the-art AI with the expertise of certified trainers, 
                we've created a marketplace that understands you—your body, your goals, 
                and your unique path to wellness.
              </p>
            </motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              style={styles.heroImageSide}
            >
              <img src={aboutImage} alt="Our Mission" style={styles.heroImage} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. VALUES SECTION */}
      <section style={styles.valuesSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Our Core Values</h2>
            <p style={styles.sectionDesc}>The principles that guide every decision we make.</p>
          </div>

          <div style={styles.valuesGrid}>
            <ValueCard 
              icon={<Heart size={32} color="#8B5CF6" />}
              title="Empathy First"
              desc="We design with compassion, ensuring our platform is inclusive, supportive, and kind."
            />
            <ValueCard 
              icon={<Zap size={32} color="#8B5CF6" />}
              title="Innovation"
              desc="We leverage AI to solve complex matching problems, making your journey effortless."
            />
            <ValueCard 
              icon={<ShieldCheck size={32} color="#8B5CF6" />}
              title="Authenticity"
              desc="Every trainer is verified. We value real connections and genuine certified expertise."
            />
            <ValueCard 
              icon={<Globe size={32} color="#8B5CF6" />}
              title="Accessibility"
              desc="Yoga is for everyone. We strive to break down barriers of distance and cost."
            />
          </div>
        </div>
      </section>

      {/* 3. MISSION SECTION */}
      <section style={styles.missionSection}>
        <div style={styles.container}>
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            style={styles.missionCard}
          >
            <Target size={48} color="#fff" style={{ marginBottom: '24px' }} />
            <h2 style={styles.missionTitle}>Our Mission</h2>
            <p style={styles.missionText}>
              "To empower 1 million individuals to live healthier, more mindful lives through 
              personalized yoga experiences driven by human expertise and artificial intelligence."
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const ValueCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    style={styles.valueCard}
  >
    <div style={styles.iconWrapper}>{icon}</div>
    <h3 style={styles.cardTitle}>{title}</h3>
    <p style={styles.cardDesc}>{desc}</p>
  </motion.div>
);

const styles = {
  pageWrapper: {
    backgroundColor: '#FAFAF9',
    color: '#1C1917',
    fontFamily: "'Inter', sans-serif",
    minHeight: '100vh',
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
  heroRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '60px',
    flexWrap: 'wrap',
  },
  heroTextSide: {
    flex: 1,
    minWidth: '320px',
  },
  heroImageSide: {
    flex: 1,
    minWidth: '350px',
  },
  heroImage: {
    width: '100%',
    borderRadius: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
  },
  badge: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  mainTitle: {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '24px',
    lineHeight: '1.2',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #8B5CF6 0%, #D946EF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pText: {
    fontSize: '18px',
    color: '#78716C',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  valuesSection: {
    padding: '140px 0',
    backgroundColor: '#FAFAF9',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  sectionTitle: {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  sectionDesc: {
    fontSize: '18px',
    color: '#78716C',
  },
  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '32px',
  },
  valueCard: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #F5F5F4',
  },
  iconWrapper: {
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  cardDesc: {
    fontSize: '15px',
    color: '#78716C',
    lineHeight: '1.5',
  },
  missionSection: {
    paddingBottom: '100px',
  },
  missionCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: '32px',
    padding: '80px 40px',
    textAlign: 'center',
    color: '#fff',
    backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  missionTitle: {
    fontSize: '32px',
    fontWeight: '800',
    marginBottom: '20px',
  },
  missionText: {
    fontSize: '22px',
    fontWeight: '500',
    maxWidth: '800px',
    lineHeight: '1.5',
    fontStyle: 'italic',
  }
};

export default About;
