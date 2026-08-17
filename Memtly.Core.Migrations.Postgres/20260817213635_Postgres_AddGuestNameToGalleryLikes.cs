using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Memtly.Core.Migrations.Postgres.Migrations
{
    /// <inheritdoc />
    public partial class Postgres_AddGuestNameToGalleryLikes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestName",
                table: "GalleryLikes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestName",
                table: "GalleryLikes");
        }
    }
}
