import { motion } from 'framer-motion'

function About() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="max-w-2xl rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-soft backdrop-blur">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">About This Setup</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          This placeholder exists only to validate nested routing, shared layout composition,
          and page transition readiness in a scalable project structure.
        </p>
      </div>
    </motion.section>
  )
}

export default About
