import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0B0F17),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const DvrSimulatorApp());
}

class DvrSimulatorApp extends StatelessWidget {
  const DvrSimulatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DVR Simulator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F17),
      ),
      home: const SimulatorWebViewScreen(),
    );
  }
}

class SimulatorWebViewScreen extends StatefulWidget {
  const SimulatorWebViewScreen({super.key});

  @override
  State<SimulatorWebViewScreen> createState() => _SimulatorWebViewScreenState();
}

class _SimulatorWebViewScreenState extends State<SimulatorWebViewScreen> {
  WebViewController? _controller;
  HttpServer? _server;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startLocalServerAndLoad();
  }

  Future<void> _startLocalServerAndLoad() async {
    try {
      // Start local HTTP server on loopback to serve bundled web assets without CORS issues
      _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final port = _server!.port;

      _server!.listen((HttpRequest request) async {
        try {
          var path = request.uri.path;
          if (path.isEmpty || path == '/') {
            path = '/index.html';
          }
          if (path.startsWith('/')) {
            path = path.substring(1);
          }
          
          final assetPath = 'assets/dist/$path';
          ByteData byteData;
          try {
            byteData = await rootBundle.load(assetPath);
          } catch (_) {
            // Fallback for SPA routing if any subpath is accessed
            byteData = await rootBundle.load('assets/dist/index.html');
            path = 'index.html';
          }

          final bytes = byteData.buffer.asUint8List();

          String contentType = 'application/octet-stream';
          if (path.endsWith('.html')) {
            contentType = 'text/html; charset=utf-8';
          } else if (path.endsWith('.js') || path.endsWith('.mjs')) {
            contentType = 'application/javascript; charset=utf-8';
          } else if (path.endsWith('.css')) {
            contentType = 'text/css; charset=utf-8';
          } else if (path.endsWith('.svg')) {
            contentType = 'image/svg+xml';
          } else if (path.endsWith('.json')) {
            contentType = 'application/json; charset=utf-8';
          } else if (path.endsWith('.png')) {
            contentType = 'image/png';
          } else if (path.endsWith('.ico')) {
            contentType = 'image/x-icon';
          } else if (path.endsWith('.woff2')) {
            contentType = 'font/woff2';
          } else if (path.endsWith('.woff')) {
            contentType = 'font/woff';
          } else if (path.endsWith('.ttf')) {
            contentType = 'font/ttf';
          }

          request.response.headers.set(HttpHeaders.contentTypeHeader, contentType);
          request.response.headers.set('Access-Control-Allow-Origin', '*');
          request.response.headers.set('Cache-Control', 'no-cache');
          request.response.add(bytes);
          await request.response.close();
        } catch (e) {
          try {
            request.response.statusCode = HttpStatus.notFound;
            request.response.write('Not found');
            await request.response.close();
          } catch (_) {}
        }
      });

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFF0B0F17))
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (String url) {
              setState(() {
                _isLoading = true;
              });
            },
            onPageFinished: (String url) {
              setState(() {
                _isLoading = false;
              });
            },
            onWebResourceError: (WebResourceError error) {
              debugPrint('WebResourceError: ${error.description}');
            },
          ),
        );

      if (controller.platform is AndroidWebViewController) {
        AndroidWebViewController.enableDebugging(false);
        final androidController = controller.platform as AndroidWebViewController;
        androidController.setMediaPlaybackRequiresUserGesture(false);
      }

      await controller.loadRequest(Uri.parse('http://127.0.0.1:$port/index.html'));

      setState(() {
        _controller = controller;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to initialize app: $e';
      });
    }
  }

  @override
  void dispose() {
    _server?.close(force: true);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_controller != null && await _controller!.canGoBack()) {
          await _controller!.goBack();
        } else {
          if (context.mounted) {
            SystemNavigator.pop();
          }
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0B0F17),
        body: SafeArea(
          child: _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.white70),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _errorMessage = null;
                              _isLoading = true;
                            });
                            _startLocalServerAndLoad();
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : Stack(
                  children: [
                    if (_controller != null) WebViewWidget(controller: _controller!),
                    if (_isLoading)
                      Container(
                        color: const Color(0xFF0B0F17),
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFF6366F1),
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}
