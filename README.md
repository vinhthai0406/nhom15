# Ghi chú Kubernetes: Web, Service và API JSON tĩnh

## 1. Web Deployment và Service

Ví dụ Deployment chạy 2 Pod cho ứng dụng web, lắng nghe ở cổng `8000`. Service chuyển traffic đến các Pod có label `app: animals-web`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: animals-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: animals-web
  template:
    metadata:
      labels:
        app: animals-web
    spec:
      containers:
        - name: web
          image: nhom150755/animals-web:1.0
          ports:
            - containerPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: animals-web
spec:
  selector:
    app: animals-web
  ports:
    - port: 80
      targetPort: 8000
  type: NodePort
```

Nếu một Pod dừng, Service vẫn có thể chuyển traffic đến Pod còn lại. Deployment sẽ tạo Pod thay thế để duy trì `replicas: 2`.

Kiểm tra và thử xóa một Pod:

```bash
kubectl get pods -l app=animals-web
kubectl delete pod <ten-pod>
kubectl get pods -l app=animals-web -w
```

Hai Pod có thể cùng nằm trên một node. Nếu node đó hỏng, cả hai Pod đều có thể bị ảnh hưởng.

## 2. Phục vụ file JSON tĩnh bằng Nginx

Không cần copy nội dung JSON dài vào YAML. Tạo ConfigMap trực tiếp từ file JSON trên máy đang chạy `kubectl`.

Ví dụ file nguồn là `animals.json`:

```bash
kubectl create configmap json-api-data \
  --from-file=data.json=./animals.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

Lệnh trên tạo hoặc cập nhật ConfigMap tên `json-api-data`. File sẽ được đặt bên trong ConfigMap với tên `data.json`.

Kiểm tra kích thước file:

```bash
wc -c animals.json
```

ConfigMap có giới hạn kích thước khoảng 1 MiB. Với file vượt giới hạn này, nên dùng PersistentVolume hoặc đóng gói file vào container image thay vì ConfigMap.

### Deployment và Service cho JSON API

Lưu nội dung sau thành `json-api.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: json-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: json-api
  template:
    metadata:
      labels:
        app: json-api
    spec:
      containers:
        - name: nginx
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: json-data
              mountPath: /usr/share/nginx/html
              readOnly: true
      volumes:
        - name: json-data
          configMap:
            name: json-api-data
---
apiVersion: v1
kind: Service
metadata:
  name: json-api
spec:
  selector:
    app: json-api
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

Áp dụng cấu hình:

```bash
kubectl apply -f json-api.yaml
kubectl get pods,svc
```

Nginx sẽ phục vụ file JSON tại:

```text
http://json-api/data.json
```

## 3. Test API trước khi nối với web

### Test từ máy đang chạy kubectl

Chạy port-forward:

```bash
kubectl port-forward svc/json-api 8080:80
```

Trong một terminal khác, gọi API:

```bash
curl -i http://localhost:8080/data.json
```

Kiểm tra JSON hợp lệ nếu đã cài `jq`:

```bash
curl -s http://localhost:8080/data.json | jq .
```

Dừng port-forward bằng `Ctrl+C`.

### Test từ bên trong Kubernetes

```bash
kubectl run curl-test --rm -it --restart=Never \
  --image=curlimages/curl:8.12.1 \
  -- curl -i http://json-api/data.json
```

Phản hồi thành công thường có HTTP `200` và nội dung JSON.

## 4. Gọi API từ ứng dụng web

Nếu backend của ứng dụng web chạy trong cùng Kubernetes namespace, ứng dụng có thể gọi:

```text
http://json-api/data.json
```

Nếu API nằm ở namespace khác, dùng tên đầy đủ:

```text
http://json-api.<namespace>.svc.cluster.local/data.json
```

Tên `json-api` là DNS nội bộ của Kubernetes Service. Trình duyệt của người dùng bên ngoài cluster thường không phân giải được DNS nội bộ này. Nếu JavaScript trên trình duyệt cần gọi API trực tiếp, cần đưa API ra ngoài cluster bằng Ingress, NodePort hoặc LoadBalancer.

## 5. Cập nhật file JSON

Sau khi sửa `animals.json`, chạy lại lệnh tạo ConfigMap:

```bash
kubectl create configmap json-api-data \
  --from-file=data.json=./animals.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

Nếu cần, khởi động lại Deployment để Nginx nạp lại file:

```bash
kubectl rollout restart deployment/json-api
```

## 6. Lệnh kiểm tra hữu ích

```bash
kubectl get pods -o wide
kubectl get svc
kubectl get endpoints json-api
kubectl describe pod <ten-pod>
kubectl logs deployment/json-api
```

`get endpoints` giúp kiểm tra Service có tìm thấy Pod phù hợp để chuyển traffic hay không.

## Chạy và truy cập ứng dụng

Deployment `animals-web` chạy 2 Pod. Service kiểu `NodePort` chuyển tiếp yêu cầu từ cổng `30080` của node đến cổng `8000` của ứng dụng trong Pod.

```bash
# Áp dụng Deployment và Service
sudo kubectl apply -f deployment.yaml

# Kiểm tra Pod
sudo kubectl get pods -l app=animals-web -o wide

# Kiểm tra Deployment và Service
sudo kubectl get deployment animals-web
sudo kubectl get svc animals-web

# Xem địa chỉ IP của node
sudo kubectl get nodes -o wide



