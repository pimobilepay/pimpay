export default function BalanceCard() {
  return (
    <div
      className="
        rounded-3xl p-6 text-center 
        backdrop-blur-xl

        /* Modes clair + sombre */
        bg-white/60 dark:bg-[#0D0F14]/60

        /* Ombres premium façon iOS / Pi Money */
        shadow-[0_8px_25px_rgba(0,0,0,0.08)]
        dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]

        border border-white/20 dark:border-white/5
      "
    >
      {/* Sous-titre */}
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
        Solde Total
      </p>

      {/* Montant principal */}
      <h1
        className="
          text-4xl font-bold mb-2 
          text-gray-900 dark:text-white
          drop-shadow-sm
        "
      >
        π 1250.75
      </h1>

      {/* Conversion Pi → USD */}
      <p
        className="
          text-sm font-medium 
          text-blue-600 dark:text-[#F5D489]
        "
      >
        1 Pi = $314 159,00 USD
      </p>
    </div>
  );
}
