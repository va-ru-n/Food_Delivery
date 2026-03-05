import React from 'react';

function HeroSection() {
  return (
    <section className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-10 text-white shadow-md md:px-10 md:py-14">
      <div className="mb-4 flex flex-wrap items-start gap-5 md:gap-8">
        <div className="relative h-20 w-[260px] overflow-hidden md:h-24 md:w-[320px]">
          <img
            src="/jpt-logo.png"
            alt="JPT Express"
            className="absolute inset-0 h-full w-full scale-[1.28] object-cover object-left"
          />
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-3xl font-extrabold tracking-tight md:text-5xl">| JPT Express</p>
          <p className="text-lg font-semibold text-orange-50 md:text-2xl">| Food.Groceries.Delevery</p>
          <p className="text-base text-orange-100 md:text-lg">| orderfrom your favorite restaurants in Jaggayyapeta.</p>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
