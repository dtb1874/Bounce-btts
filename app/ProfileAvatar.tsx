type Props = {
  name: string;
  portraitUrl?: string | null;
  size?: "small" | "medium" | "large";
  className?: string;
  presentation?: "avatar" | "cutout";
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function ProfileAvatar({ name, portraitUrl, size = "small", className = "", presentation = "avatar" }: Props) {
  const px = size === "large" ? 76 : size === "medium" ? 50 : 36;
  const isCutout = presentation === "cutout";
  return (
    <span
      className={className}
      data-profile-avatar={presentation}
      style={{
        position: "relative",
        width: px,
        height: px,
        minWidth: px,
        borderRadius: isCutout ? 16 : "50%",
        overflow: isCutout ? "visible" : "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        border: isCutout ? "1px solid rgba(240,207,170,.34)" : "2px solid rgba(240,207,170,.78)",
        outline: isCutout ? "none" : "1px solid rgba(116,32,52,.9)",
        outlineOffset: 2,
        background: isCutout
          ? "radial-gradient(circle at 50% 72%, rgba(116,32,52,.38), rgba(20,14,18,.26) 58%, transparent 72%)"
          : "linear-gradient(145deg, #8f2a49, #3f1426 72%)",
        color: "#f5d9b2",
        fontSize: size === "large" ? 20 : size === "medium" ? 14 : 11,
        fontWeight: 900,
        letterSpacing: ".045em",
        boxShadow: isCutout
          ? "0 10px 22px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,239,216,.09)"
          : "0 8px 18px rgba(0,0,0,.36), 0 0 0 4px rgba(116,32,52,.18), inset 0 1px 0 rgba(255,239,216,.15)",
      }}
      aria-hidden="true"
    >
      {portraitUrl ? <img src={portraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: isCutout ? "contain" : "cover", display: "block", borderRadius: isCutout ? 0 : "inherit", filter: isCutout ? "drop-shadow(0 10px 12px rgba(0,0,0,.42))" : "saturate(.94) contrast(1.03)" }} /> : <span>{initials(name)}</span>}
    </span>
  );
}
