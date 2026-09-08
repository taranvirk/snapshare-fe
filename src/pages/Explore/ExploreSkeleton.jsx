export default function ExploreSkeleton() {
  return (
    <div className="explore-grid explore-grid--skeleton" aria-label="Loading Explore posts">
      {Array.from({ length: 12 }, (_, index) => <span className={`explore-skeleton ${index === 0 ? "explore-skeleton--featured" : ""}`} key={index} />)}
    </div>
  );
}
