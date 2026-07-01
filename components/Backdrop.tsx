// Декоративный фон на чистых CSS-градиентах — без blur-фильтров и анимаций,
// поэтому почти не нагружает GPU (композитится один раз).
export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: `
          radial-gradient(60rem 40rem at 12% -10%, rgba(155,28,49,0.30), transparent 60%),
          radial-gradient(50rem 38rem at 100% 20%, rgba(232,80,112,0.14), transparent 55%),
          radial-gradient(55rem 45rem at 35% 115%, rgba(107,16,32,0.34), transparent 60%),
          #0a0507
        `,
      }}
    >
      {/* виньетка */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
