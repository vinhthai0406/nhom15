## Deploy ứng dụng mẫu lên cluster

Chạy các lệnh từ máy client đã cấu hình `kubectl`.

### 1. Truy cập bằng port-forward

Tạo Deployment và Service:

```bash
kubectl create deployment demo-web --image=nginx:stable
kubectl expose deployment demo-web --port=80 --target-port=80
kubectl rollout status deployment/demo-web
kubectl get pods -o wide
```

Mở terminal khác và chuyển tiếp cổng:

```bash
kubectl port-forward svc/demo-web 8080:80
```

Kiểm tra kết nối từ máy client:

```bash
curl -I http://localhost:8080
```

Phản hồi HTTP như `200 OK` cho biết ứng dụng truy cập được qua Service. `port-forward` phù hợp để kiểm tra nhanh, không thay thế cách expose ứng dụng cho người dùng thực tế.

### 2. Truy cập qua NodePort

Đổi Service sang loại `NodePort`:

```bash
kubectl patch svc demo-web -p '{"spec":{"type":"NodePort"}}'
kubectl get svc demo-web
```

Lấy số cổng ở cột `PORT(S)`, rồi truy cập từ client:

```text
http://<IP-node>:<NodePort>
```

Firewall cần cho phép cổng tương ứng. Không mở cổng ra Internet nếu không cần thiết.