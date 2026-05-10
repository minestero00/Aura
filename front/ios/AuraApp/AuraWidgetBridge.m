#import <React/RCTBridgeModule.h>

// Swift class @objc(AuraWidget)을 RN module로 노출. 메서드 시그니처는 .swift 파일과 일치.
@interface RCT_EXTERN_MODULE(AuraWidget, NSObject)

RCT_EXTERN_METHOD(setNextEvent:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(clearNextEvent:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
