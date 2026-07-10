import { X } from "lucide-react";
import { type Order } from "../AdminContext";

interface OrderDrawerProps {
  order: Order | null;
  onClose: () => void;
}

export function OrderDrawer({ order, onClose }: OrderDrawerProps) {
  if (!order) return null;

  return (
    <>
      <div className="admin-drawer-overlay" onClick={onClose} />
      <div className="admin-drawer">
        <div className="admin-drawer-header">
          <h2>Order {order.id}</h2>
          <button onClick={onClose} className="admin-drawer-close">
            <X size={20} />
          </button>
        </div>

        <div className="admin-drawer-content">
          <div className="admin-order-meta">
            <div>
              <p className="meta-label">Customer</p>
              <p>{order.customer}</p>
              <p className="text-sm text-muted">{order.email}</p>
            </div>
            <div>
              <p className="meta-label">Date</p>
              <p>{new Date(order.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="meta-label">Status</p>
              <span className={`admin-badge badge-${order.status}`}>{order.status}</span>
            </div>
          </div>

          <div className="admin-order-address">
            <p className="meta-label">Shipping Address</p>
            <p>{order.address}</p>
          </div>

          <div className="admin-order-items">
            <p className="meta-label">Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})</p>
            {order.items.map((item, idx) => (
              <div key={idx} className="admin-order-item">
                <img src={item.image} alt={item.productName} />
                <div className="admin-order-item-details">
                  <h4>{item.productName}</h4>
                  <p>Size: {item.size} | Color: {item.color}</p>
                  <p>Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                </div>
                <div className="admin-order-item-total">
                  ${(item.quantity * item.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-drawer-footer">
          <div className="admin-summary-row">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="admin-summary-row">
            <span>Shipping</span>
            <span>${order.shipping.toFixed(2)}</span>
          </div>
          <div className="admin-summary-row">
            <span>Tax</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          <div className="admin-summary-row total">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
