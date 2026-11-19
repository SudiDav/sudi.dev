import AppKit
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count == 4 else {
    fatalError("Usage: swift segment_portrait.swift input-image mask.png landmarks.json")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let maskURL = URL(fileURLWithPath: CommandLine.arguments[2])
let landmarksURL = URL(fileURLWithPath: CommandLine.arguments[3])
guard
    let imageSource = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil)
else {
    fatalError("Could not load portrait at \(inputURL.path)")
}

let segmentation = VNGeneratePersonSegmentationRequest()
segmentation.qualityLevel = .accurate
segmentation.outputPixelFormat = kCVPixelFormatType_OneComponent8
let faceDetection = VNDetectFaceLandmarksRequest()
let handler = VNImageRequestHandler(cgImage: image)
var maskCreated = false
do {
    try handler.perform([segmentation])
    if let maskBuffer = segmentation.results?.first?.pixelBuffer {
        let maskCI = CIImage(cvPixelBuffer: maskBuffer)
        let maskRect = CGRect(x: 0, y: 0, width: CVPixelBufferGetWidth(maskBuffer), height: CVPixelBufferGetHeight(maskBuffer))
        if let maskImage = CIContext().createCGImage(maskCI, from: maskRect),
           let destination = CGImageDestinationCreateWithURL(maskURL as CFURL, UTType.png.identifier as CFString, 1, nil) {
            CGImageDestinationAddImage(destination, maskImage, nil)
            maskCreated = CGImageDestinationFinalize(destination)
        }
    }
} catch {
    fputs("Vision person segmentation unavailable; the Blender builder will derive a matte from the neutral photo border. \(error)\n", stderr)
}

do {
    try handler.perform([faceDetection])
} catch {
    fputs("Vision face landmarks unavailable; the Blender builder will use conservative photo-derived coordinates. \(error)\n", stderr)
}

func globalPoints(_ region: VNFaceLandmarkRegion2D?, in box: CGRect) -> [[Double]] {
    (region?.normalizedPoints ?? []).map { point in
        [Double(box.origin.x + CGFloat(point.x) * box.width), Double(box.origin.y + CGFloat(point.y) * box.height)]
    }
}

let faces = (faceDetection.results ?? []).map { face in
    let box = face.boundingBox
    return [
        "box": [Double(box.origin.x), Double(box.origin.y), Double(box.width), Double(box.height)],
        "faceContour": globalPoints(face.landmarks?.faceContour, in: box),
        "leftEye": globalPoints(face.landmarks?.leftEye, in: box),
        "rightEye": globalPoints(face.landmarks?.rightEye, in: box),
        "nose": globalPoints(face.landmarks?.nose, in: box),
        "noseCrest": globalPoints(face.landmarks?.noseCrest, in: box),
        "outerLips": globalPoints(face.landmarks?.outerLips, in: box),
    ] as [String: Any]
}

let result: [String: Any] = [
    "source": inputURL.lastPathComponent,
    "width": image.width,
    "height": image.height,
    "personMask": maskCreated ? maskURL.lastPathComponent : NSNull(),
    "faces": faces,
]
let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
try data.write(to: landmarksURL, options: .atomic)
print("Wrote \(maskCreated ? "Vision foreground mask" : "face landmarks for derived matte") and \(faces.count) face observation(s).")
