"use client";

type JoinGroupButtonProps = {
  isJoined: boolean;
  onClick: () => void;
  disabled?: boolean;
  unavailableLabel?: string;
};

export function JoinGroupButton({
  isJoined,
  onClick,
  disabled = false,
  unavailableLabel = "Group unavailable",
}: JoinGroupButtonProps) {
  return (
    <button
      id="card_info_join_btn"
      className={`join-button ${isJoined ? "join-button-active" : "join-button-inactive"}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {isJoined ? "Leave group" : disabled ? unavailableLabel : "Join group"}
    </button>
  );
}
