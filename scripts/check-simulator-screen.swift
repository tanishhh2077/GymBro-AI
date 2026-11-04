import Foundation
import Vision
import Darwin

// CI-only check of the empty app shell; never run on workout screenshots.
guard CommandLine.arguments.count == 2 else {
    fputs("Usage: check-simulator-screen <empty-shell.png>\n", stderr)
    exit(64)
}

do {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    // Hosted runners do not guarantee an available graphics device.
    request.usesCPUOnly = true
    let image = URL(fileURLWithPath: CommandLine.arguments[1])
    try VNImageRequestHandler(url: image, options: [:]).perform([request])
    let words = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    let text = words.joined(separator: " ")
    print("Empty-shell screen text: \(text)")
    let normalized = text.lowercased().filter { $0.isLetter || $0.isNumber }
    guard normalized.contains("gymbroai"), normalized.contains("benchpress") else {
        fputs("GymBro AI bench-press interface is not visible yet.\n", stderr)
        exit(1)
    }
    print("GymBro AI bench-press startup interface is visible.")
} catch {
    fputs("Could not inspect the empty-shell screenshot: \(error)\n", stderr)
    exit(2)
}
