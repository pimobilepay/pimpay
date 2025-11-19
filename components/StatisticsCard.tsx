export default function StatisticsCard() {
  return (
    <div className="
      bg-white dark:bg-darkCard 
      shadow-smooth dark:shadow-dark
      rounded-3xl p-5 mt-6
    ">
      <h3 className="font-semibold mb-4">Statistiques / Activité</h3>

      <div className="flex justify-between items-center">
        {/* Cercle Pi */}
        <div className="
          w-24 h-24 rounded-full border-8 
          border-primary dark:border-gold
          flex items-center justify-center 
        ">
          <span className="text-3xl text-primary dark:text-gold">π</span>
        </div>

        {/* Graph barres */}
        <div className="flex gap-2 items-end h-20">
          <div className="w-3 h-6 rounded bg-primary/40 dark:bg-gold/40"></div>
          <div className="w-3 h-10 rounded bg-primary/50 dark:bg-gold/50"></div>
          <div className="w-3 h-14 rounded bg-primary/70 dark:bg-gold/70"></div>
          <div className="w-3 h-20 rounded bg-primary dark:bg-gold"></div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-100 dark:text-gray-300 mt-2">
        Solde
      </p>
    </div>
  );
}
