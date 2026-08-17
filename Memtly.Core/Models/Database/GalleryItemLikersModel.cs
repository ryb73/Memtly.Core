namespace Memtly.Core.Models.Database
{
    public class GalleryItemLikersModel
    {
        public List<string> Names { get; set; } = new();
        public int AnonymousCount { get; set; } = 0;
    }
}
