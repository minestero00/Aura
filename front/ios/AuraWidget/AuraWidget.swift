import SwiftUI
import WidgetKit

// AURA iOS 홈/잠금화면 위젯 — 다음 일정 한 줄 + 시간 + 장소.
//
// 데이터 흐름: 메인 앱이 UserDefaults(suiteName: APP_GROUP)에 push → Widget이 같은 suite에서 읽음.
// App Group은 entitlement로 양쪽에 등록되어야 작동 (manual/IOS_WIDGET_SETUP.md 참고).
//
// 이 파일은 별도 Xcode "Widget Extension" target에 포함. 메인 AuraApp target과 분리된
// process(extension)으로 실행되며 RN/JavaScript 의존 없음 — pure SwiftUI.

private let APP_GROUP = "group.com.dumbteam.aura"

struct AuraWidgetEntry: TimelineEntry {
  let date: Date
  let title: String?
  let meta: String?
  let location: String?
  let emptyMessage: String
}

struct AuraWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> AuraWidgetEntry {
    AuraWidgetEntry(
      date: Date(),
      title: nil,
      meta: nil,
      location: nil,
      emptyMessage: "오늘 일정이 없어요."
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (AuraWidgetEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<AuraWidgetEntry>) -> Void
  ) {
    let entry = loadEntry()
    // 30분 뒤 자동 새 timeline 요청. 메인 앱이 그 사이 setNextEvent로 push하면
    // WidgetCenter.reloadTimelines로 즉시 다시 호출 — policy.after는 fallback.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }

  private func loadEntry() -> AuraWidgetEntry {
    let defaults = UserDefaults(suiteName: APP_GROUP)
    return AuraWidgetEntry(
      date: Date(),
      title: defaults?.string(forKey: "next.title"),
      meta: defaults?.string(forKey: "next.meta"),
      location: defaults?.string(forKey: "next.location"),
      emptyMessage: defaults?.string(forKey: "next.emptyMessage") ?? "오늘 일정이 없어요."
    )
  }
}

struct AuraWidgetEntryView: View {
  let entry: AuraWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("AURA")
        .font(.system(size: 11, weight: .bold))
        .tracking(2)
        .foregroundColor(.white.opacity(0.86))

      if let title = entry.title, !title.isEmpty {
        Text(title)
          .font(.system(size: 16, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(2)
          .padding(.top, 6)
        if let meta = entry.meta, !meta.isEmpty {
          Text(meta)
            .font(.system(size: 13))
            .foregroundColor(.white.opacity(0.92))
            .lineLimit(1)
        }
        if let location = entry.location, !location.isEmpty {
          Text(location)
            .font(.system(size: 12))
            .foregroundColor(.white.opacity(0.78))
            .lineLimit(1)
        }
      } else {
        Text(entry.emptyMessage)
          .font(.system(size: 16, weight: .bold))
          .foregroundColor(.white)
          .padding(.top, 6)
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .containerBackground(for: .widget) {
      LinearGradient(
        gradient: Gradient(colors: [
          Color(red: 0.557, green: 0.463, blue: 1.0),
          Color(red: 0.290, green: 0.247, blue: 0.659)
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    }
  }
}

@main
struct AuraWidget: Widget {
  let kind: String = "AuraWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AuraWidgetProvider()) { entry in
      AuraWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("AURA 다음 일정")
    .description("홈화면에서 다음 일정을 한 줄로 확인.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
