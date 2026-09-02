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
      className={className}
      style={{
        width: px,
        height: px,
        minWidth: px,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        border: "1px solid rgba(240,207,170,.5)",
        background: "rgba(116,32,52,.12)",
        color: "#742034",
        fontSize: size === "medium" ? 13 : 10,
        fontWeight: 800,
        letterSpacing: ".04em",
      }}
      aria-hidden="true"
    >
      {portraitUrl ? <img src={portraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span>{initials(name)}</span>}
    </span>
  );
}
