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
  const px = size === "large" ? 72 : size === "medium" ? 42 : 31;
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
        borderRadius: isCutout ? 14 : "50%",
        overflow: isCutout ? "visible" : "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        border: isCutout ? "1px solid rgba(240,207,170,.26)" : "1px solid rgba(240,207,170,.58)",
        background: isCutout
          ? "radial-gradient(circle at 50% 72%, rgba(116,32,52,.28), rgba(20,14,18,.2) 58%, transparent 72%)"
          : "linear-gradient(145deg, rgba(116,32,52,.88), rgba(39,17,26,.96))",
        color: "#f0cfaa",
        fontSize: size === "large" ? 19 : size === "medium" ? 13 : 10,
        fontWeight: 900,
        letterSpacing: ".04em",
        boxShadow: isCutout
          ? "inset 0 1px 0 rgba(255,239,216,.07)"
          : "0 5px 12px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,239,216,.12)",
      }}
      aria-hidden="true"
    >
      {portraitUrl ? <img src={portraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: isCutout ? "contain" : "cover", display: "block", borderRadius: isCutout ? 0 : "inherit", filter: isCutout ? "drop-shadow(0 8px 10px rgba(0,0,0,.38))" : "none" }} /> : <span>{initials(name)}</span>}
    </span>
  );
}
