type Props = {
  name: string;
  portraitUrl?: string | null;
  size?: "small" | "medium";
  className?: string;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function ProfileAvatar({ name, portraitUrl, size = "small", className = "" }: Props) {
  const px = size === "medium" ? 42 : 31;
  return (
    <span
      className={`memberPortraitAvatar ${size === "medium" ? "memberPortraitAvatarMedium" : ""} ${className}`.trim()}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {portraitUrl ? <img src={portraitUrl} alt="" /> : <span>{initials(name)}</span>}
    </span>
  );
}
