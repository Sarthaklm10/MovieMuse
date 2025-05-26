import { useState } from "react"
import PropTypes from "prop-types"

const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '8px 0',
    maxWidth: '100%',
    overflow: 'hidden'
}

const starContainerStyle = {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    flexWrap: 'wrap'
}

// Extract star SVG components
const FilledStar = ({ color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill={color}
    stroke={color}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const EmptyStar = ({ color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke={color}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

StarRating.propTypes = {
    maxRating: PropTypes.number,
    color: PropTypes.string,
    size: PropTypes.number,
    messages: PropTypes.arrayOf(PropTypes.string),
    className: PropTypes.string,
    defaultRating: PropTypes.number,
    onSetRating: PropTypes.func
}

export default function StarRating({
    maxRating = 5,
    color = "var(--color-star)",
    size = 24,
    messages = [],
    className = "",
    defaultRating = 0,
    onSetRating
}) {
    const [rating, setRating] = useState(defaultRating);
    const [tempRating, setTempRating] = useState(0);

    function handleRating(rating) {
        setRating(rating)
        onSetRating(rating)
    }

    const textStyle = {
        lineHeight: "1.1",
        margin: "0",
        color: tempRating ? "var(--color-star-hover)" : color,
        fontSize: `${size * 0.8}px`,
        fontWeight: "600",
        minWidth: `${size * 1.5}px`,
        transition: "color 0.3s"
    }

    // Display message or rating number
    const displayText = messages.length === maxRating 
        ? (messages[tempRating - 1] || messages[rating - 1] || "")
        : (tempRating || rating || "");

    return (
        <div style={containerStyle} className={className}>
            <div style={starContainerStyle}>
                {Array.from({ length: maxRating }, (_, i) => (
                    <Star key={i}
                        index={i + 1}
                        onRate={handleRating}
                        rating={rating}
                        tempRating={tempRating}
                        setTempRating={setTempRating}
                        color={color}
                        size={size}
                    />
                ))}
            </div>
            <p style={textStyle}>{displayText}</p>
        </div>
    )
}

function Star({ index, onRate, rating, tempRating, setTempRating, color, size }) {
    const isHovering = tempRating > 0;
    const isFilled = tempRating ? index <= tempRating : index <= rating;
    const activeColor = tempRating ? "var(--color-star-hover)" : color;
    
    const starStyle = {
        width: `${size}px`,
        height: `${size}px`,
        display: "block",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: isHovering && index <= tempRating ? "scale(1.15)" : "scale(1)",
        filter: isHovering && isFilled ? "drop-shadow(0 0 3px var(--color-star-hover))" : "none",
    }

    return (
        <span
            role="button"
            style={starStyle}
            onClick={() => onRate(index)}
            onMouseEnter={() => setTempRating(index)}
            onMouseLeave={() => setTempRating(0)}
        >
            {isFilled ? <FilledStar color={activeColor} /> : <EmptyStar color={activeColor} />}
        </span>
    )
}