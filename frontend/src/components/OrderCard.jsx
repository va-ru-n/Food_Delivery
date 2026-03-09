import React, { useMemo } from 'react';

const statusBadgeClasses = {
  Pending: 'bg-amber-200 text-amber-900',
  Preparing: 'bg-sky-200 text-sky-900',
  Assigned: 'bg-indigo-200 text-indigo-900',
  PickedUp: 'bg-violet-200 text-violet-900',
  OutForDelivery: 'bg-purple-200 text-purple-900',
  Delivered: 'bg-emerald-200 text-emerald-900',
  Rejected: 'bg-rose-200 text-rose-900',
  Cancelled: 'bg-rose-200 text-rose-900'
};

const cardClasses = {
  Pending: 'border-amber-200 bg-amber-50',
  Preparing: 'border-sky-200 bg-sky-50',
  Assigned: 'border-indigo-200 bg-indigo-50',
  PickedUp: 'border-violet-200 bg-violet-50',
  OutForDelivery: 'border-purple-200 bg-purple-50',
  Delivered: 'border-emerald-200 bg-emerald-50',
  Rejected: 'border-rose-200 bg-rose-50',
  Cancelled: 'border-rose-200 bg-rose-50'
};

function OrderCard({
  order,
  countdown,
  highlight,
  onAccept,
  onReject,
  onAssign,
  onPartnerSelect,
  partnerOptions,
  selectedPartnerId,
  disableActions
}) {
  const timerLabel = useMemo(() => {
    if (order.status !== 'Pending' || !Number.isFinite(countdown)) {
      return null;
    }

    return countdown > 0 ? `${countdown}s` : 'Expired';
  }, [countdown, order.status]);

  return (
    <article
      className={`rounded-xl border p-4 shadow-sm transition ${cardClasses[order.status] || 'border-gray-200 bg-white'} ${highlight ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
          <p className="text-sm text-gray-600">{order.userId?.name || 'Customer'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {order.status}
        </span>
      </div>

      {timerLabel && (
        <p className="mt-2 text-sm font-medium text-amber-800">Accept within: {timerLabel}</p>
      )}

      <p className="mt-2 text-sm text-gray-700">Address: {order.deliveryAddress}</p>
      <p className="text-sm text-gray-700">Phone: {order.phoneNumber}</p>
      <p className="text-sm text-gray-700">Total: Rs. {order.totalAmount}</p>
      {order.deliveryPartner && (
        <p className="text-sm text-gray-700">Delivery Partner: {order.deliveryPartner?.name}</p>
      )}

      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {order.items.map((item) => (
          <li key={`${order._id}-${item.foodItem}`}>{item.name} x {item.quantity}</li>
        ))}
      </ul>

      {order.status === 'Pending' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAccept(order._id)}
            disabled={disableActions}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onReject(order._id)}
            disabled={disableActions}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-70"
          >
            Reject
          </button>
        </div>
      )}

      {order.status === 'Preparing' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={selectedPartnerId || ''}
            onChange={(event) => onPartnerSelect(order._id, event.target.value)}
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm"
          >
            <option value="">Select Delivery Partner</option>
            {partnerOptions.map((partner) => (
              <option key={partner._id} value={partner._id}>
                {partner.name} ({partner.email || partner.phoneNumber || 'N/A'})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onAssign(order._id)}
            disabled={disableActions || !selectedPartnerId}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            Assign Partner
          </button>
        </div>
      )}
    </article>
  );
}

export default OrderCard;
