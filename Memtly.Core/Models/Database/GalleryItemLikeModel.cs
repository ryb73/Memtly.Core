namespace Memtly.Core.Models.Database
{
    public class GalleryItemLikeModel
    {
        public GalleryItemLikeModel()
            : this(0, 0, 0, null, null, new DateTime(0, DateTimeKind.Utc))
        {
        }

        public GalleryItemLikeModel(int id, int galleryItemId, int galleryId, int? userId, string? guestName, DateTimeOffset timestamp)
        {
            Id = id;
            GalleryItemId = galleryItemId;
            GalleryId = galleryId;
            UserId = userId;
            GuestName = guestName;
            Timestamp = timestamp;
        }

        public int Id { get; set; }
        public int GalleryItemId { get; set; }
        public int GalleryId { get; set; }
        public int? UserId { get; set; }
        public string? GuestName { get; set; }
        public DateTimeOffset Timestamp { get; set; }
    }
}