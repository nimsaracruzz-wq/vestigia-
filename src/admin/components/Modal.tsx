import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="admin-modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="admin-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
