import React, { createContext, useContext, useState } from "react";

type ConfirmOptions = {
  message: string;
  resolve: (value: boolean) => void;
  onConfirm?: () => void;
};

const ConfirmContext = createContext<(msg: string, onConfirm?: () => void) => Promise<boolean>>(
  async () => false,
);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const confirm = (message: string, onConfirm?: () => void) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve, onConfirm });
    });
  };

  const handleYes = () => {
    confirmState?.onConfirm?.();
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleNo = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {confirmState && (
        <div className="confirm-overlay">
          <div className="confirm-panel">
            <p className="confirm-message">{confirmState.message}</p>

            <div className="confirm-actions">
              <button onClick={handleNo} className="confirm-button-cancel">
                Cancel
              </button>

              <button onClick={handleYes} className="confirm-button-continue">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
