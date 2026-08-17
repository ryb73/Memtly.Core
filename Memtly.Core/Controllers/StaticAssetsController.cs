using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace Memtly.Core.Controllers
{
    [AllowAnonymous]
    public class StaticAssetsController : Controller
    {
        private readonly IWebHostEnvironment _env;

        public StaticAssetsController(IWebHostEnvironment env)
            : base()
        {
            _env = env;
        }

        [HttpGet("/service-worker.js")]
        public IActionResult ServiceWorker()
        {
            var file = _env.WebRootFileProvider.GetFileInfo("_content/Memtly.Core/dist/service-worker.js");
            if (!file.Exists)
            {
                return NotFound();
            }

            Response.Headers.Append("Service-Worker-Allowed", "/");
            Response.Headers.CacheControl = "no-cache";

            return File(file.CreateReadStream(), "application/javascript");
        }
    }
}
