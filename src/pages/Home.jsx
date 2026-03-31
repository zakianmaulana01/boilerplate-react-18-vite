import { motion } from 'framer-motion'

function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="max-w-3xl rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-soft backdrop-blur xl:p-10">
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Boilerplate Ready
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Enterprise-ready React starter with a clean routing foundation.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          This home page is intentionally minimal to prove the layout, Tailwind setup, and
          Framer Motion transition are wired correctly from day one.
        </p>
        <button
          type="button"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Explore Foundation
        </button>
      </div>
    </motion.div>
  )
}

export default Home
