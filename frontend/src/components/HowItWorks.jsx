import React from 'react';

const RestaurantIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V6a4 4 0 0 1 8 0v4" />
  </svg>
);

const OrderIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l3 3v15H6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v3h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h4" />
  </svg>
);

const DeliveryIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 14h10v4H3zM13 16h2l2-3h2l2 3v2h-2" />
    <circle cx="7" cy="20" r="2" />
    <circle cx="18" cy="20" r="2" />
  </svg>
);

const steps = [
  {
    title: 'Step 1',
    text: 'Choose your favorite restaurant',
    icon: RestaurantIcon
  },
  {
    title: 'Step 2',
    text: 'Place your order easily',
    icon: OrderIcon
  },
  {
    title: 'Step 3',
    text: 'Get fast delivery at your doorstep',
    icon: DeliveryIcon
  }
];

function HowItWorks() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">How JPT Express Works</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex rounded-full bg-orange-100 p-2 text-brand-700">
                <Icon />
              </div>
              <p className="font-semibold text-gray-900">{step.title}</p>
              <p className="mt-1 text-sm text-gray-600">{step.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default HowItWorks;
