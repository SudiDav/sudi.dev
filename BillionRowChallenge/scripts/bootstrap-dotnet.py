#!/usr/bin/env python3
"""Install a pinned, SHA-512-verified official ARM64 SDK locally, never system-wide."""
import hashlib
from pathlib import Path
import shutil
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VERSION = "10.0.114"
URL = f"https://builds.dotnet.microsoft.com/dotnet/Sdk/{VERSION}/dotnet-sdk-{VERSION}-osx-arm64.tar.gz"
SHA512 = "0f69e32e55107f5e823d38103e24da7fa4279eeda7b94851c88b16de02c0ad4cb2d9a8b8c5560709a0316d18ecc5c6183049acca77cddf5a3498f28d8806e563"


def main():
    output = ROOT / "artifacts/dotnet"
    if (output / f"sdk/{VERSION}/dotnet.dll").is_file():
        print(f"SDK {VERSION} already present at {output}")
        return
    output.mkdir(parents=True, exist_ok=True)
    archive = ROOT / "artifacts/dotnet-sdk.tar.gz"
    print(f"Downloading official .NET SDK {VERSION} to {output}", flush=True)
    with urllib.request.urlopen(URL) as response, archive.open("wb") as destination:
        shutil.copyfileobj(response, destination)
    digest = hashlib.sha512()
    with archive.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != SHA512:
        raise RuntimeError("SDK SHA-512 mismatch; archive was not extracted")
    with tarfile.open(archive) as source:
        for member in source.getmembers():
            target = (output / member.name).resolve()
            if output.resolve() not in target.parents and target != output.resolve():
                raise RuntimeError("Unexpected archive path")
            if member.issym() or member.islnk():
                link = (target.parent / member.linkname).resolve() if member.issym() else (output / member.linkname).resolve()
                if output.resolve() not in link.parents and link != output.resolve():
                    raise RuntimeError("Unexpected archive link")
        source.extractall(output)
    archive.unlink()
    print(f"Verified and installed {VERSION}. Set DOTNET_ROOT={output} and prepend it to PATH.")


if __name__ == "__main__":
    main()
