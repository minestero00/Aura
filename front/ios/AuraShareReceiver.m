#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Swift class(AuraShareReceiver)를 Objective-C/RN bridge에 노출.
// Swift 파일은 RCTEventEmitter를 상속 + @objc(AuraShareReceiver) 어노테이션.
@interface RCT_EXTERN_REMAP_MODULE(AuraShareReceiver, AuraShareReceiver, RCTEventEmitter)

RCT_EXTERN_METHOD(fetchPending:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setSharedSession:(NSString *)accessToken
                  apiBase:(NSString *)apiBase
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
