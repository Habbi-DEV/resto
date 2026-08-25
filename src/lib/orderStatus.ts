export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'In the kitchen',
  ready: 'Ready',
  out_for_delivery: 'On the way',
  completed: 'Served',
};

export const ORDER_STATUS_HINT: Record<string, string> = {
  pending: 'Waiting for the restaurant to confirm your order…',
  confirmed: 'Your order has been accepted 👍',
  preparing: 'The kitchen is on it 👨‍🍳',
  ready: 'Ready! We will bring it to your table shortly.',
  out_for_delivery: 'Your courier is on the way 🛵',
  completed: 'Enjoy your meal! Bon appétit 🧡',
};
