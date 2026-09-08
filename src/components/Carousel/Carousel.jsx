import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";

function isImage(url = "") {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|avif)$/.test(cleanUrl);
}

Carousel.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  cover: PropTypes.bool,
  label: PropTypes.string,
};

export default function Carousel({ images = [], cover = false, label = "Post media" }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => setCurrentIndex(0), [images]);

  if (!images.length) {
    return <div className="media-empty">No media attached</div>;
  }

  const previous = () => setCurrentIndex((index) => index === 0 ? images.length - 1 : index - 1);
  const next = () => setCurrentIndex((index) => index === images.length - 1 ? 0 : index + 1);
  const current = images[currentIndex];

  return (
    <div className={`carousel ${cover ? "carousel--cover" : ""}`} aria-label={label}>
      {isImage(current) ? (
        <img src={current} alt={`${label} ${currentIndex + 1} of ${images.length}`} />
      ) : (
        <video src={current} controls playsInline preload="metadata" aria-label={`${label} ${currentIndex + 1} of ${images.length}`} />
      )}

      {images.length > 1 && (
        <>
          <button className="carousel__arrow carousel__arrow--left" onClick={previous} aria-label="Previous media"><ChevronLeftIcon /></button>
          <button className="carousel__arrow carousel__arrow--right" onClick={next} aria-label="Next media"><ChevronRightIcon /></button>
          <div className="carousel__dots" aria-label={`Media ${currentIndex + 1} of ${images.length}`}>
            {images.map((_, index) => (
              <button key={index} className={index === currentIndex ? "active" : ""} onClick={() => setCurrentIndex(index)} aria-label={`Show media ${index + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
